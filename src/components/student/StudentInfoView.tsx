import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateStudent, Student } from '@/hooks/use-students';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { formatCurrency, formatDate } from '@/lib/wallet-utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface StudentInfoViewProps {
  student: Student;
  role: 'admin' | 'teacher';
}

export function StudentInfoView({ student, role }: StudentInfoViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const updateStudent = useUpdateStudent();

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    parent_guardian_name: '',
    age: '',
    gender: '',
    nationality: '',
    school: '',
    year_group: '',
    program_id: '',
    student_level: '',
    teacher_id: '',
  });

  const startEditing = () => {
    setEditForm({
      name: student.name,
      phone: student.phone,
      parent_guardian_name: student.parent_guardian_name || '',
      age: student.age?.toString() || '',
      gender: student.gender || '',
      nationality: student.nationality || '',
      school: student.school || '',
      year_group: student.year_group || '',
      program_id: student.program_id || '',
      student_level: student.student_level || '',
      teacher_id: student.teacher_id || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateStudent.mutateAsync({
        studentId: student.student_id,
        name: editForm.name,
        phone: editForm.phone,
        parent_guardian_name: editForm.parent_guardian_name || null,
        age: editForm.age ? parseInt(editForm.age) : null,
        gender: editForm.gender || null,
        nationality: editForm.nationality || null,
        school: editForm.school || null,
        year_group: editForm.year_group || null,
        program_id: editForm.program_id || null,
        student_level: editForm.student_level || null,
        teacher_id: editForm.teacher_id || null,
      });
      toast.success('Student updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update student');
    }
  };

  const programName = programs?.find(p => p.program_id === student.program_id)?.name;
  const teacherName = teachers?.find(t => t.teacher_id === student.teacher_id)?.name;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Student Information</CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{student.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{student.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parent/Guardian</p>
                <p className="font-medium">{student.parent_guardian_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">{student.age || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{student.gender || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nationality</p>
                <p className="font-medium">{student.nationality || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">School</p>
                <p className="font-medium">{student.school || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year Group</p>
                <p className="font-medium">{student.year_group || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Program</p>
                <p className="font-medium">{programName || student.programs?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="font-medium">{student.student_level || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teacher</p>
                <p className="font-medium">{teacherName || student.teachers?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-medium">{formatCurrency(student.total_paid || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Renewals</p>
                <p className="font-medium">{student.number_of_renewals || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">{student.created_at ? formatDate(student.created_at) : '-'}</p>
              </div>
            </div>
            <Button onClick={startEditing}>Edit Information</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Parent/Guardian Name</Label>
                <Input
                  value={editForm.parent_guardian_name}
                  onChange={(e) => setEditForm({ ...editForm, parent_guardian_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={editForm.nationality}
                  onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>School</Label>
                <Input
                  value={editForm.school}
                  onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Year Group</Label>
                <Input
                  value={editForm.year_group}
                  onChange={(e) => setEditForm({ ...editForm, year_group: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Program</Label>
                <Select value={editForm.program_id} onValueChange={(v) => setEditForm({ ...editForm, program_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>
                    {programs?.filter(p => p.is_active).map((program) => (
                      <SelectItem key={program.program_id} value={program.program_id}>{program.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={editForm.student_level} onValueChange={(v) => setEditForm({ ...editForm, student_level: v })}>
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
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={editForm.teacher_id} onValueChange={(v) => setEditForm({ ...editForm, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers?.filter(t => t.is_active).map((teacher) => (
                      <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateStudent.isPending}>
                {updateStudent.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
