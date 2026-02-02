import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, BookOpen, GraduationCap } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useClass, useUpdateClass } from '@/hooks/use-classes';
import { useTeachers } from '@/hooks/use-teachers';
import { useStudents } from '@/hooks/use-students';
import { useLessons } from '@/hooks/use-lessons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate, getWalletColor, getStatusColor } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ClassLesson {
  lesson_id: string;
  lesson_date: string | null;
  date: string | null;
  status: string;
  notes: string | null;
  students: { name: string; student_id: string } | null;
  teachers: { name: string } | null;
}

function useClassLessons(classId: string) {
  return useQuery({
    queryKey: ['class-lessons', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons_log')
        .select('lesson_id, lesson_date, date, status, notes, students(name, student_id), teachers(name)')
        .eq('class_id', classId)
        .order('lesson_date', { ascending: false });

      if (error) throw error;
      return data as ClassLesson[];
    },
    enabled: !!classId,
  });
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: classData, isLoading: classLoading } = useClass(id || '');
  const { data: teachers } = useTeachers();
  const { data: allStudents } = useStudents();
  const { data: lessons } = useClassLessons(id || '');
  const updateClass = useUpdateClass();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    schedule: '',
    teacher_id: '',
  });

  useEffect(() => {
    if (classData) {
      setFormData({
        name: classData.name,
        schedule: classData.schedule || '',
        teacher_id: classData.teacher_id || '',
      });
    }
  }, [classData]);

  // Note: Since students are directly assigned to teachers, not classes,
  // we show students whose teacher matches this class's teacher
  const enrolledStudents = allStudents?.filter(s => s.teacher_id === classData?.teacher_id) || [];
  const takenLessons = lessons?.filter(l => l.status === 'Taken').length || 0;

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateClass.mutateAsync({
        classId: id,
        name: formData.name,
        schedule: formData.schedule || undefined,
        teacher_id: formData.teacher_id || undefined,
      });
      toast({ title: 'Class updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      toast({ title: 'Error updating class', variant: 'destructive' });
    }
  };

  if (classLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!classData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Class not found</p>
          <Button variant="ghost" onClick={() => navigate('/admin/settings')} className="mt-4">
            Back to Settings
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const assignedTeacher = teachers?.find(t => t.teacher_id === classData.teacher_id);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold">{classData.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              {classData.schedule && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> {classData.schedule}
                </span>
              )}
              {assignedTeacher && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" /> {assignedTeacher.name}
                </span>
              )}
            </div>
          </div>
          <Button variant={isEditing ? 'outline' : 'default'} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {isEditing && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Edit Class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Class Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Input
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="e.g., Mon/Wed 5PM"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers?.map((t) => (
                        <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} disabled={updateClass.isPending}>
                {updateClass.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{enrolledStudents.length}</p>
                  <p className="text-sm text-muted-foreground">Enrolled Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-wallet-positive/10">
                  <BookOpen className="w-5 h-5 text-wallet-positive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{takenLessons}</p>
                  <p className="text-sm text-muted-foreground">Lessons Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-wallet-warning/10">
                  <GraduationCap className="w-5 h-5 text-wallet-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignedTeacher?.name || '-'}</p>
                  <p className="text-sm text-muted-foreground">Assigned Teacher</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Students ({enrolledStudents.length})</TabsTrigger>
            <TabsTrigger value="lessons">Lesson History ({lessons?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card className="glass-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Wallet</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        No students enrolled in this class
                      </td>
                    </tr>
                  ) : (
                    enrolledStudents.map((student) => (
                      <tr
                        key={student.student_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/students/${student.student_id}`)}
                      >
                        <td className="font-medium">{student.name}</td>
                        <td>{student.phone}</td>
                        <td>
                          <span className={getWalletColor(student.wallet_balance || 0)}>
                            {student.wallet_balance || 0} lessons
                          </span>
                        </td>
                        <td>
                          <Badge variant="outline" className={getStatusColor(student.status || 'Active')}>
                            {student.status || 'Active'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="lessons">
            <Card className="glass-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Teacher</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {!lessons?.length ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No lessons recorded for this class
                      </td>
                    </tr>
                  ) : (
                    lessons.slice(0, 50).map((lesson) => (
                      <tr key={lesson.lesson_id}>
                        <td>{formatDate(lesson.lesson_date || lesson.date)}</td>
                        <td
                          className="cursor-pointer hover:text-primary"
                          onClick={() => lesson.students && navigate(`/admin/students/${lesson.students.student_id}`)}
                        >
                          {lesson.students?.name || '-'}
                        </td>
                        <td>{lesson.teachers?.name || '-'}</td>
                        <td>
                          <Badge
                            variant="outline"
                            className={
                              lesson.status === 'Taken'
                                ? 'bg-wallet-positive/20 text-wallet-positive'
                                : lesson.status === 'Absent'
                                ? 'bg-wallet-negative/20 text-wallet-negative'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {lesson.status}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground max-w-[200px] truncate">
                          {lesson.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
