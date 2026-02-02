import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeachers } from '@/hooks/use-teachers';
import { useUpdateTrialStudent, type TrialStudent } from '@/hooks/use-trial-students';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConvertToStudentDialogProps {
  trialStudent: TrialStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PROGRAMMES = [
  'Arabic A',
  'Arabic B',
  'IGCSE',
  'Adult Course',
  'Islamic Arabic',
];

export function ConvertToStudentDialog({ 
  trialStudent, 
  open, 
  onOpenChange,
  onSuccess 
}: ConvertToStudentDialogProps) {
  const { toast } = useToast();
  const { data: teachers } = useTeachers();
  const updateTrialStudent = useUpdateTrialStudent();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    parent_guardian_name: '',
    phone: '',
    teacher_id: '',
    program: '',
  });

  useEffect(() => {
    if (trialStudent) {
      setFormData({
        name: trialStudent.name || '',
        parent_guardian_name: trialStudent.parent_guardian_name || '',
        phone: trialStudent.phone || '',
        teacher_id: trialStudent.teacher_id || '',
        program: trialStudent.interested_program || '',
      });
    }
  }, [trialStudent]);

  const handleConvert = async () => {
    if (!trialStudent) return;

    if (!formData.name || !formData.phone || !formData.teacher_id) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in name, WhatsApp contact, and assign a teacher.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create the new student record
      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert({
          name: formData.name,
          parent_guardian_name: formData.parent_guardian_name || null,
          phone: formData.phone,
          teacher_id: formData.teacher_id,
          status: 'Active',
          wallet_balance: 0,
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Update the trial student to mark as converted
      await updateTrialStudent.mutateAsync({
        trial_id: trialStudent.trial_id,
        status: 'Converted',
        converted_student_id: newStudent.student_id,
        registration_date: new Date().toISOString().split('T')[0],
      });

      toast({
        title: 'Student converted successfully!',
        description: `${formData.name} has been added as a regular student.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error converting student',
        description: error.message || 'Failed to convert trial student.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Convert to Regular Student
          </DialogTitle>
          <DialogDescription>
            Convert this trial student to a regular student.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Will be removed from Trial Students
          </Badge>
        </div>

        <div className="space-y-4 py-2">
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
            <Label htmlFor="parent_guardian_name">Parent Name</Label>
            <Input
              id="parent_guardian_name"
              value={formData.parent_guardian_name}
              onChange={(e) => setFormData({ ...formData, parent_guardian_name: e.target.value })}
              placeholder="Enter parent name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp Contact *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter WhatsApp number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher_id">Assign Teacher *</Label>
            <Select
              value={formData.teacher_id}
              onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers?.filter(t => t.is_active).map((teacher) => (
                  <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Programme</Label>
            <Select
              value={formData.program}
              onValueChange={(value) => setFormData({ ...formData, program: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select programme" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMMES.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Convert to Student
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
