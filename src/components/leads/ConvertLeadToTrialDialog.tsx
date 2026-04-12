import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, DollarSign } from 'lucide-react';
import { useCreateTrialStudent } from '@/hooks/use-trial-students';
import { useUpdateLead, type Lead } from '@/hooks/use-leads';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { useToast } from '@/hooks/use-toast';
import { logLeadActivity } from '@/lib/activity-logger';

interface ConvertLeadToTrialDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertLeadToTrialDialog({ lead, open, onOpenChange }: ConvertLeadToTrialDialogProps) {
  const { toast } = useToast();
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const createTrialStudent = useCreateTrialStudent();
  const updateLead = useUpdateLead();

  const [formData, setFormData] = useState({
    parent_guardian_name: '',
    age: '',
    gender: '',
    school: '',
    year_group: '',
    student_level: '',
    teacher_id: '',
    trial_date: '',
    trial_time: '',
    notes: '',
  });

  const selectedTeacher = teachers?.find(t => t.teacher_id === formData.teacher_id);
  const update = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleConvert = async () => {
    if (!lead) return;
    try {
      await createTrialStudent.mutateAsync({
        name: lead.name,
        phone: lead.phone,
        parent_guardian_name: formData.parent_guardian_name || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        gender: formData.gender || undefined,
        school: formData.school || undefined,
        year_group: formData.year_group || undefined,
        interested_program: lead.interest || undefined,
        student_level: formData.student_level || undefined,
        teacher_id: formData.teacher_id || undefined,
        trial_date: formData.trial_date || undefined,
        trial_time: formData.trial_time || undefined,
        notes: formData.notes || lead.notes || undefined,
        handled_by: lead.handled_by || undefined,
      });

      // Update lead status to Trial Booked
      await updateLead.mutateAsync({
        leadId: lead.lead_id,
        trial_status: 'Trial Booked',
      });

      logLeadActivity(lead.lead_id, 'Lead converted to trial student',
        `Converted to trial | Date: ${formData.trial_date || 'TBD'}`);

      toast({ title: 'Lead converted!', description: `${lead.name} has been added as a trial student.` });
      onOpenChange(false);
      setFormData({ parent_guardian_name: '', age: '', gender: '', school: '', year_group: '', student_level: '', teacher_id: '', trial_date: '', trial_time: '', notes: '' });
    } catch {
      toast({ title: 'Error', description: 'Failed to convert lead to trial student.', variant: 'destructive' });
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Lead to Trial Student</DialogTitle>
          <DialogDescription>
            Create a trial lesson for <strong>{lead.name}</strong> ({lead.phone})
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />30 min lesson
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />50/50 split
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Pre-filled info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student Name</Label>
              <Input value={lead.name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={lead.phone} disabled className="bg-muted" />
            </div>
          </div>

          {lead.interest && (
            <div className="space-y-2">
              <Label>Interested Programme</Label>
              <Input value={lead.interest} disabled className="bg-muted" />
            </div>
          )}

          {/* Additional trial info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Parent/Guardian Name</Label>
              <Input value={formData.parent_guardian_name} onChange={e => update('parent_guardian_name', e.target.value)} placeholder="Enter parent name" />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input type="number" value={formData.age} onChange={e => update('age', e.target.value)} placeholder="Enter age" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={v => update('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Student Level</Label>
              <Select value={formData.student_level} onValueChange={v => update('student_level', v)}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Elementary">Elementary</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Upper Intermediate">Upper Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign Teacher</Label>
              <Select value={formData.teacher_id} onValueChange={v => update('teacher_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers?.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.teacher_id} value={t.teacher_id}>
                      {t.name} (EGP {t.rate_per_lesson}/lesson)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeacher && (
                <p className="text-xs text-muted-foreground">
                  Teacher: EGP {(selectedTeacher.rate_per_lesson / 2).toFixed(2)} • Admin: EGP {(selectedTeacher.rate_per_lesson / 2).toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>School</Label>
              <Input value={formData.school} onChange={e => update('school', e.target.value)} placeholder="Enter school" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trial Date</Label>
              <Input type="date" value={formData.trial_date} onChange={e => update('trial_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Trial Time</Label>
              <Input type="time" value={formData.trial_time} onChange={e => update('trial_time', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={e => update('notes', e.target.value)} placeholder={lead.notes || 'Additional notes...'} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConvert} disabled={createTrialStudent.isPending}>
            {createTrialStudent.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Convert to Trial Student
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
