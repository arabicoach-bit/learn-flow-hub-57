import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeachers } from '@/hooks/use-teachers';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Users, BookOpen, Download, Clock, GraduationCap } from 'lucide-react';
import { formatSalary } from '@/lib/wallet-utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, getFilterLabel, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { fetchAllTeachersTotalHours, type TeacherTotalHoursResult } from '@/hooks/use-teacher-total-hours';

interface TeacherPayrollData {
  teacher_id: string;
  teacher_name: string;
  email: string | null;
  lessons_taken: number;
  total_hours: number;
  rate_per_lesson: number;
  salary_earned: number;
  active_students: number;
  temp_stop_students: number;
  left_students: number;
  trial_lessons: number;
}

export default function AdminPayroll() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const { data: teachers, isLoading: teachersLoading } = useTeachers();

  const { startDate, endDate } = getFilterDateRange(filter);

  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['admin-payroll-unified', startDate, endDate],
    refetchInterval: 10000,
    queryFn: async () => {
      const teacherIds = (teachers || []).map(t => t.teacher_id);
      if (teacherIds.length === 0) return [];

      // Use shared batch function for hours/salary
      const hoursByTeacher = await fetchAllTeachersTotalHours(teacherIds, startDate, endDate);

      // Fetch students & trial students for counts
      const [studentsRes, trialStudentsRes] = await Promise.all([
        supabase.from('students').select('student_id, teacher_id, status'),
        supabase.from('trial_students').select('trial_id, teacher_id, status').eq('status', 'Scheduled'),
      ]);

      const students = studentsRes.data || [];
      const trialStudents = trialStudentsRes.data || [];

      const payroll: TeacherPayrollData[] = (teachers || []).map(teacher => {
        const hrs = hoursByTeacher[teacher.teacher_id] || {} as TeacherTotalHoursResult;
        const teacherStudents = students.filter(s => s.teacher_id === teacher.teacher_id);

        return {
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.name,
          email: teacher.email || null,
          lessons_taken: hrs.totalLessons || 0,
          total_hours: hrs.totalHours || 0,
          rate_per_lesson: hrs.ratePerHour || 0,
          salary_earned: hrs.salary || 0,
          active_students: teacherStudents.filter(s => s.status === 'Active').length,
          temp_stop_students: teacherStudents.filter(s => s.status === 'Temporary Stop').length,
          left_students: teacherStudents.filter(s => s.status === 'Left').length,
          trial_lessons: trialStudents.filter(t => t.teacher_id === teacher.teacher_id).length,
        };
      });

      return payroll.sort((a, b) => b.salary_earned - a.salary_earned);
    },
    enabled: !!teachers,
  });

  const isLoading = teachersLoading || payrollLoading;
  
  const totalLessons = payrollData?.reduce((sum, t) => sum + t.lessons_taken, 0) || 0;
  const totalHours = payrollData?.reduce((sum, t) => sum + t.total_hours, 0) || 0;
  const totalSalary = payrollData?.reduce((sum, t) => sum + t.salary_earned, 0) || 0;
  const totalActiveStudents = payrollData?.reduce((sum, t) => sum + t.active_students, 0) || 0;
  const totalTrialLessons = payrollData?.reduce((sum, t) => sum + t.trial_lessons, 0) || 0;
  const activeTeachers = payrollData?.filter(t => t.lessons_taken > 0).length || 0;

  const exportToCSV = () => {
    if (!payrollData || payrollData.length === 0) return;
    
    const headers = ['Teacher', 'Rate/Hr (EGP)', 'Lessons', 'Hours', 'Salary (EGP)', 'Active', 'Temp Stopped', 'Left', 'Trial Lessons'];
    const rows = payrollData.map(t => [
      t.teacher_name, t.rate_per_lesson.toString(), t.lessons_taken.toString(),
      t.total_hours.toFixed(2), t.salary_earned.toFixed(2), t.active_students.toString(),
      t.temp_stop_students.toString(), t.left_students.toString(), t.trial_lessons.toString(),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-analytics-${getFilterLabel(filter)}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Teacher Analytics & Payroll</h1>
            <p className="text-muted-foreground">{getFilterLabel(filter)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <YearMonthFilter value={filter} onChange={setFilter} />
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!payrollData?.length}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Teachers</p>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-xl font-bold">{activeTeachers}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><BookOpen className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Lessons</p>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-xl font-bold">{totalLessons}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-5 h-5 text-amber-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-xl font-bold">{totalHours.toFixed(1)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-emerald-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><Wallet className="w-5 h-5 text-emerald-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Payroll</p>
                  {isLoading ? <Skeleton className="h-7 w-16" /> : <p className="text-xl font-bold text-emerald-400">{formatSalary(totalSalary)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><GraduationCap className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Students</p>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-xl font-bold">{totalActiveStudents}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Users className="w-5 h-5 text-amber-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Trial Lessons</p>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-xl font-bold">{totalTrialLessons}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unified Teacher Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Teacher Performance & Salaries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : payrollData && payrollData.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-center">Rate/hr</TableHead>
                      <TableHead className="text-center">Lessons</TableHead>
                      <TableHead className="text-center">Hours</TableHead>
                      <TableHead className="text-center">Salary</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">Temp. Stopped</TableHead>
                      <TableHead className="text-center">Left</TableHead>
                      <TableHead className="text-center">Trial Lessons</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData.map((teacher) => (
                      <TableRow 
                        key={teacher.teacher_id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                              {teacher.teacher_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium">{teacher.teacher_name}</p>
                              <p className="text-xs text-muted-foreground">{teacher.email || '-'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{formatSalary(teacher.rate_per_lesson)}</TableCell>
                        <TableCell className="text-center font-medium">{teacher.lessons_taken}</TableCell>
                        <TableCell className="text-center font-medium">{teacher.total_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-center font-semibold text-emerald-400">{formatSalary(teacher.salary_earned)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">{teacher.active_students}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">{teacher.temp_stop_students}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30">{teacher.left_students}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">{teacher.trial_lessons}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data for this period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
