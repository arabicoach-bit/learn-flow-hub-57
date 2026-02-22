import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, DollarSign, BookOpen, Users, Receipt, GraduationCap, Clock, CalendarDays, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeacher, useUpdateTeacher } from '@/hooks/use-teachers';

import { useLessons } from '@/hooks/use-lessons';
import { useStudents } from '@/hooks/use-students';
import { useTeacherLiveStats } from '@/hooks/use-teacher-live-stats';
import { Button } from '@/components/ui/button';
import { getWalletColor, getStatusDisplayLabel, getStatusBadgeClass } from '@/lib/wallet-utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatSalary, formatDate } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface PayrollRecord {
  payroll_id: string;
  period_start: string;
  period_end: string;
  lessons_taken: number | null;
  rate_per_lesson: number;
  amount_due: number;
  status: string | null;
  created_at: string | null;
}

function useTeacherPayroll(teacherId: string) {
  return useQuery({
    queryKey: ['teacher-payroll', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers_payroll')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as PayrollRecord[];
    },
    enabled: !!teacherId,
  });
}

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: teacher, isLoading: teacherLoading } = useTeacher(id || '');
  
  const { data: lessons } = useLessons({ teacher_id: id });
  const { data: payroll } = useTeacherPayroll(id || '');
  const { data: allStudents } = useStudents();
  const { data: liveStats, isLoading: liveStatsLoading } = useTeacherLiveStats(id || '');
  
  const teacherStudents = allStudents?.filter(s => s.teacher_id === id) || [];
  const updateTeacher = useUpdateTeacher();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    rate_per_lesson: '',
  });

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name,
        phone: teacher.phone || '',
        email: teacher.email || '',
        rate_per_lesson: teacher.rate_per_lesson?.toString() || '',
      });
    }
  }, [teacher]);

  

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateTeacher.mutateAsync({
        teacherId: id,
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        rate_per_lesson: formData.rate_per_lesson ? parseFloat(formData.rate_per_lesson) : undefined,
      });
      toast({ title: 'Teacher updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      toast({ title: 'Error updating teacher', variant: 'destructive' });
    }
  };

  const getPayrollStatusColor = (status: string | null) => {
    switch (status) {
      case 'Paid': return 'bg-wallet-positive/20 text-wallet-positive';
      case 'Approved': return 'bg-wallet-warning/20 text-wallet-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (teacherLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!teacher) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Teacher not found</p>
          <Button variant="ghost" onClick={() => navigate('/admin/teachers')} className="mt-4">
            Back to Teachers
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/teachers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold">{teacher.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              {teacher.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {teacher.phone}
                </span>
              )}
              {teacher.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" /> {teacher.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> {formatSalary(teacher.rate_per_lesson)} / lesson
              </span>
            </div>
          </div>
          <Button variant={isEditing ? 'outline' : 'default'} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {isEditing && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Edit Teacher</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Lesson (EGP)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.rate_per_lesson}
                    onChange={(e) => setFormData({ ...formData, rate_per_lesson: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={updateTeacher.isPending}>
                {updateTeacher.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{teacherStudents.length}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-accent">
                  <CalendarDays className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{liveStatsLoading ? '...' : liveStats?.todayLessons.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Today's Lessons</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-secondary">
                  <Clock className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{liveStatsLoading ? '...' : `${liveStats?.weeklyHours || 0}h`}</p>
                  <p className="text-sm text-muted-foreground">Weekly Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{liveStatsLoading ? '...' : `${liveStats?.monthlyHours || 0}h`}</p>
                  <p className="text-sm text-muted-foreground">Monthly Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{liveStatsLoading ? '...' : liveStats?.monthlyLessonsCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Lessons This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-accent">
                  <Receipt className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{liveStatsLoading ? '...' : formatSalary(liveStats?.monthlySalary || 0)}</p>
                  <p className="text-sm text-muted-foreground">Salary This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Lessons */}
        {liveStats && liveStats.todayLessons.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <CalendarDays className="w-5 h-5" />
                Today's Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveStats.todayLessons.map((lesson) => (
                  <div key={lesson.scheduled_lesson_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-bold">{lesson.scheduled_time?.slice(0, 5)}</p>
                        <p className="text-xs text-muted-foreground">{lesson.duration_minutes} min</p>
                      </div>
                      <div>
                        <p className="font-medium">{lesson.student_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {lesson.program_name && <span>{lesson.program_name}</span>}
                          {lesson.student_level && <span>• {lesson.student_level}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lesson.wallet_balance !== null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${getWalletColor(lesson.wallet_balance)}`}>
                          {lesson.wallet_balance} lessons
                        </span>
                      )}
                      <Badge variant="outline" className={
                        lesson.status === 'completed' ? 'bg-wallet-positive/20 text-wallet-positive' :
                        lesson.status === 'scheduled' ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }>
                        {lesson.status === 'completed' ? 'Done' : lesson.status === 'scheduled' ? 'Pending' : lesson.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Students ({teacherStudents.length})</TabsTrigger>
            <TabsTrigger value="lessons">Lessons ({lessons?.length || 0})</TabsTrigger>
            <TabsTrigger value="payroll">Payroll ({payroll?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card className="glass-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Program</th>
                    <th>Level</th>
                    <th>Wallet</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teacherStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No students assigned to this teacher
                      </td>
                    </tr>
                  ) : (
                    teacherStudents.map((student) => (
                      <tr key={student.student_id}>
                        <td className="font-medium">{student.name}</td>
                        <td>{student.phone}</td>
                        <td>{student.programs?.name || '-'}</td>
                        <td>{student.student_level || '-'}</td>
                        <td>
                          <span className={`font-medium ${getWalletColor(student.wallet_balance || 0)}`}>
                            {student.wallet_balance} lessons
                          </span>
                        </td>
                        <td>
                          <Badge
                            variant="outline"
                            className={
                              student.status === 'Active'
                                ? 'status-active'
                                : student.status === 'Temporary Stop'
                                ? 'status-grace'
                                : 'status-blocked'
                            }
                          >
                            {getStatusDisplayLabel(student.status)}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/students/${student.student_id}`)}
                          >
                            View
                          </Button>
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
                    <th>Class</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!lessons?.length ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        No lessons recorded
                      </td>
                    </tr>
                  ) : (
                    lessons.slice(0, 50).map((lesson) => (
                      <tr key={lesson.lesson_id}>
                        <td>{formatDate(lesson.lesson_date || lesson.date)}</td>
                        <td>{lesson.students?.name || '-'}</td>
                        <td>{lesson.classes?.name || '-'}</td>
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="payroll">
            <Card className="glass-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Lessons</th>
                    <th>Rate</th>
                    <th>Amount Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!payroll?.length ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No payroll records
                      </td>
                    </tr>
                  ) : (
                    payroll.map((record) => (
                      <tr key={record.payroll_id}>
                        <td>
                          {formatDate(record.period_start)} - {formatDate(record.period_end)}
                        </td>
                        <td>{record.lessons_taken}</td>
                        <td>{formatSalary(record.rate_per_lesson)}</td>
                        <td className="font-medium">{formatSalary(record.amount_due)}</td>
                        <td>
                          <Badge variant="outline" className={getPayrollStatusColor(record.status)}>
                            {record.status || 'Draft'}
                          </Badge>
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
