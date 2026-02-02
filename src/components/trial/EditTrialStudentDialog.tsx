import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateTrialStudent, type TrialStudent } from '@/hooks/use-trial-students';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];

interface EditTrialStudentDialogProps {
  student: TrialStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTrialStudentDialog({ student, open, onOpenChange }: EditTrialStudentDialogProps) {
  const { toast } = useToast();
  const updateTrialStudent = useUpdateTrialStudent();
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();

  const [formData, setFormData] = useState({
    name: '',
    parent_guardian_name: '',
    phone: '',
    age: '',
    gender: '',
    school: '',
    year_group: '',
    interested_program: '',
    student_level: '',
    teacher_id: '',
    trial_date: '',
    trial_time: '',
    status: '' as TrialStatus | '',
    trial_result: '' as TrialResult | '',
    notes: '',
    handled_by: '',
    follow_up_notes: '',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        parent_guardian_name: student.parent_guardian_name || '',
        phone: student.phone || '',
        age: student.age?.toString() || '',
        gender: student.gender || '',
        school: student.school || '',
        year_group: student.year_group || '',
        interested_program: student.interested_program || '',
        student_level: student.student_level || '',
        teacher_id: student.teacher_id || '',
        trial_date: student.trial_date || '',
        trial_time: student.trial_time || '',
        status: student.status || '',
        trial_result: student.trial_result || '',
        notes: student.notes || '',
        handled_by: student.handled_by || '',
        follow_up_notes: student.follow_up_notes || '',
      });
    }
  }, [student]);

  const handleSave = async () => {
    if (!student) return;

    try {
      await updateTrialStudent.mutateAsync({
        trial_id: student.trial_id,
        name: formData.name,
        parent_guardian_name: formData.parent_guardian_name || undefined,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
        school: formData.school || undefined,
        year_group: formData.year_group || undefined,
        interested_program: formData.interested_program || undefined,
        student_level: formData.student_level || undefined,
        teacher_id: formData.teacher_id || undefined,
        trial_date: formData.trial_date || undefined,
        trial_time: formData.trial_time || undefined,
        status: formData.status as TrialStatus || undefined,
        trial_result: formData.trial_result as TrialResult || undefined,
        notes: formData.notes || undefined,
        handled_by: formData.handled_by || undefined,
        follow_up_notes: formData.follow_up_notes || undefined,
      });

      toast({
        title: 'Trial student updated',
        description: 'Changes saved successfully.',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update trial student.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trial Student</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter student name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_guardian_name">Parent/Guardian Name</Label>
                <Input
                  id="parent_guardian_name"
                  value={formData.parent_guardian_name}
                  onChange={(e) => setFormData({ ...formData, parent_guardian_name: e.target.value })}
                  placeholder="Enter parent name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Enter age"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Input
                  id="school"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  placeholder="Enter school"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_group">Year Group</Label>
                <Input
                  id="year_group"
                  value={formData.year_group}
                  onChange={(e) => setFormData({ ...formData, year_group: e.target.value })}
                  placeholder="e.g., Year 5, Grade 10"
                />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Academic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interested_program">Interested Program</Label>
                <Select
                  value={formData.interested_program}
                  onValueChange={(value) => setFormData({ ...formData, interested_program: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map((program) => (
                      <SelectItem key={program.program_id} value={program.name}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student_level">Student Level</Label>
                <Select
                  value={formData.student_level}
                  onValueChange={(value) => setFormData({ ...formData, student_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher_id">Assigned Teacher</Label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Trial Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Trial Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trial_date">Trial Date</Label>
                <Input
                  id="trial_date"
                  type="date"
                  value={formData.trial_date}
                  onChange={(e) => setFormData({ ...formData, trial_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial_time">Trial Time</Label>
                <Input
                  id="trial_time"
                  type="time"
                  value={formData.trial_time}
                  onChange={(e) => setFormData({ ...formData, trial_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as TrialStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Converted">Converted</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial_result">Trial Result</Label>
                <Select
                  value={formData.trial_result}
                  onValueChange={(value) => setFormData({ ...formData, trial_result: value as TrialResult })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Very Positive">Very Positive</SelectItem>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Neutral">Neutral</SelectItem>
                    <SelectItem value="Negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="handled_by">Handled By</Label>
                <Input
                  id="handled_by"
                  value={formData.handled_by}
                  onChange={(e) => setFormData({ ...formData, handled_by: e.target.value })}
                  placeholder="Who handled this trial"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Notes
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">General Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Enter any notes about this trial student"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow_up_notes">Follow-up Notes</Label>
                <Textarea
                  id="follow_up_notes"
                  value={formData.follow_up_notes}
                  onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                  placeholder="Notes for follow-up actions"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTrialStudent.isPending}>
            {updateTrialStudent.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
