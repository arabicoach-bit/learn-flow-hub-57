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
import { usePrograms } from '@/hooks/use-programs';
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

export function ConvertToStudentDialog({ 
  trialStudent, 
  open, 
  onOpenChange,
  onSuccess 
}: ConvertToStudentDialogProps) {
  const { toast } = useToast();
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const updateTrialStudent = useUpdateTrialStudent();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    parent_guardian_name: '',
    phone: '',
    parent_phone: '',
    age: '',
    gender: '',
    school: '',
    year_group: '',
    student_level: '',
    teacher_id: '',
    program_id: '',
  });

  useEffect(() => {
    if (trialStudent) {
      // Find program ID from name
      const program = programs?.find(p => p.name === trialStudent.interested_program);
      
      setFormData({
        name: trialStudent.name || '',
        parent_guardian_name: trialStudent.parent_guardian_name || '',
        phone: trialStudent.phone || '',
        parent_phone: trialStudent.phone || '', // Use same phone as parent phone initially
        age: trialStudent.age?.toString() || '',
        gender: trialStudent.gender || '',
        school: trialStudent.school || '',
        year_group: trialStudent.year_group || '',
        student_level: trialStudent.student_level || '',
        teacher_id: trialStudent.teacher_id || '',
        program_id: program?.program_id || '',
      });
    }
  }, [trialStudent, programs]);

  const handleConvert = async () => {
    if (!trialStudent) return;

    if (!formData.name || !formData.phone || !formData.teacher_id) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in name, phone, and assign a teacher.',
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
          parent_phone: formData.parent_phone || null,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender || null,
          school: formData.school || null,
          year_group: formData.year_group || null,
          student_level: formData.student_level || null,
          teacher_id: formData.teacher_id,
          program_id: formData.program_id || null,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Convert to Regular Student
          </DialogTitle>
          <DialogDescription>
            Convert this trial student to a regular student. They will be assigned to a teacher and can start taking normal lessons.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Will be removed from Trial Students
          </Badge>
        </div>

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
                <Label htmlFor="phone">Student Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_phone">Parent Phone</Label>
                <Input
                  id="parent_phone"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  placeholder="Enter parent phone"
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

          {/* Assignment */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Assignment
            </h3>
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="program_id">Program</Label>
                <Select
                  value={formData.program_id}
                  onValueChange={(value) => setFormData({ ...formData, program_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.filter(p => p.is_active).map((program) => (
                      <SelectItem key={program.program_id} value={program.program_id}>
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
                    <SelectItem value="Elementary">Elementary</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Upper Intermediate">Upper Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
