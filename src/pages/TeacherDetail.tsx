import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, DollarSign, GraduationCap, BookOpen, TrendingUp, Receipt } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeacher, useUpdateTeacher } from '@/hooks/use-teachers';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { useStudents } from '@/hooks/use-students';
import { useTeacherTotalHours } from '@/hooks/use-teacher-total-hours';
import { Button } from '@/components/ui/button';
import { getWalletColor, getStatusDisplayLabel } from '@/lib/wallet-utils';
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
import { format } from 'date-fns';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

interface SalaryHistoryRecord {
  monthLabel: string;
  monthDate: string;
  lessons: number;
  hours: number;
  salary: number;
  isPending: boolean;
}

function useTeacherSalaryHistory(teacherId: string) {
  return useQuery({
    queryKey: ['teacher-salary-history', teacherId],
    queryFn: async () => {
      const { data: lessons } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_date, duration_minutes')
        .eq('teacher_id', teacherId)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false });

      const { data: trials } = await supabase
        .from('trial_lessons_log')
        .select('lesson_date')
        .eq('teacher_id', teacherId)
        .eq('status', 'completed');

      const { data: teacher } = await supabase
        .from('teachers')
        .select('rate_per_lesson')
        .eq('teacher_id', teacherId)
        .single();

      const rate = teacher?.rate_per_lesson || 0;

      const monthMap: Record<string, { monthLabel: string; monthDate: string; lessons: number; minutes: number; trialCount: number }> = {};

      lessons?.forEach(l => {
        const monthKey = l.scheduled_date.slice(0, 7);
        const monthLabel = format(new Date(l.scheduled_date.slice(0, 7) + '-01'), 'MMM yyyy');
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        }
        monthMap[monthKey].lessons += 1;
        monthMap[monthKey].minutes += l.duration_minutes || 0;
      });

      trials?.forEach(t => {
        const monthKey = t.lesson_date.slice(0, 7);
        const monthLabel = format(new Date(t.lesson_date.slice(0, 7) + '-01'), 'MMM yyyy');
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        }
        monthMap[monthKey].trialCount += 1;
      });

      const currentMonth = format(new Date(), 'yyyy-MM');

      return Object.values(monthMap)
        .sort((a, b) => b.monthDate.localeCompare(a.monthDate))
        .map(m => {
          const regularHours = m.minutes / 60;
          const trialHours = m.trialCount * 0.5;
          const totalHours = regularHours + trialHours;
          const totalLessons = m.lessons + m.trialCount;
          return {
            monthLabel: m.monthLabel,
            monthDate: m.monthDate,
            lessons: totalLessons,
            hours: totalHours,
            salary: Math.round(totalHours * rate * 100) / 100,
            isPending: m.monthDate === currentMonth,
          } as SalaryHistoryRecord;
        });
    },
    enabled: !!teacherId,
  });
}

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: teacher, isLoading: teacherLoading } = useTeacher(id || '');

  const { data: lessons } = useScheduledLessons({ teacher_id: id });
  const { data: salaryHistory } = useTeacherSalaryHistory(id || '');
  const { data: allStudents } = useStudents();

  const [filter, setFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const { startDate, endDate } = getFilterDateRange(filter);
  const { data: filteredStats } = useTeacherTotalHours(id, startDate, endDate);

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
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
            Back
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
                <DollarSign className="w-4 h-4" /> {formatSalary(teacher.rate_per_lesson)} / hour
              </span>
            </div>
          </div>
          <YearMonthFilter value={filter} onChange={setFilter} />
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
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Hour (EGP)</Label>
                  <Input type="number" step="0.01" value={formData.rate_per_lesson} onChange={(e) => setFormData({ ...formData, rate_per_lesson: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={updateTeacher.isPending}>
                {updateTeacher.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="p-3 rounded-lg bg-secondary">
                  <BookOpen className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredStats ? `${filteredStats.totalHours.toFixed(1)}h` : '...'}</p>
                  <p className="text-sm text-muted-foreground">Hours</p>
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
                  <p className="text-2xl font-bold">{filteredStats?.totalLessons ?? '...'}</p>
                  <p className="text-sm text-muted-foreground">Lessons</p>
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
                  <p className="text-2xl font-bold">{filteredStats ? formatSalary(filteredStats.salary) : '...'}</p>
                  <p className="text-sm text-muted-foreground">Salary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Students ({teacherStudents.length})</TabsTrigger>
            <TabsTrigger value="lessons">Lessons ({lessons?.length || 0})</TabsTrigger>
            <TabsTrigger value="payroll">Payroll ({salaryHistory?.length || 0})</TabsTrigger>
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
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/students/${student.student_id}`)}>
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
                    <th>Duration</th>
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
                      <tr key={lesson.scheduled_lesson_id}>
                        <td>{formatDate(lesson.scheduled_date)}</td>
                        <td>{lesson.students?.name || '-'}</td>
                        <td>{lesson.duration_minutes || '-'} min</td>
                        <td>
                          <Badge
                            variant="outline"
                            className={
                              lesson.status === 'completed'
                                ? 'bg-wallet-positive/20 text-wallet-positive'
                                : lesson.status === 'absent'
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
                    <th>Month</th>
                    <th>Lessons</th>
                    <th>Hours</th>
                    <th>Salary</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!salaryHistory?.length ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No salary history yet
                      </td>
                    </tr>
                  ) : (
                    <>
                      {salaryHistory.map((record) => (
                        <tr key={record.monthDate}>
                          <td>{record.monthLabel}</td>
                          <td>{record.lessons}</td>
                          <td>{record.hours.toFixed(1)}h</td>
                          <td className="font-medium">{formatSalary(record.salary)}</td>
                          <td>
                            <Badge variant="outline" className={record.isPending ? 'bg-wallet-warning/20 text-wallet-warning' : 'bg-wallet-positive/20 text-wallet-positive'}>
                              {record.isPending ? '⏳ Pending' : '✅ Paid'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t">
                        <td>All Time Total</td>
                        <td>{salaryHistory.reduce((s, r) => s + r.lessons, 0)}</td>
                        <td>{salaryHistory.reduce((s, r) => s + r.hours, 0).toFixed(1)}h</td>
                        <td>{formatSalary(salaryHistory.reduce((s, r) => s + r.salary, 0))}</td>
                        <td></td>
                      </tr>
                    </>
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
