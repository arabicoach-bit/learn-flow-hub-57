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
import { Wallet, Users, BookOpen, DollarSign, Download } from 'lucide-react';
import { formatSalary } from '@/lib/wallet-utils';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

type PeriodFilter = 'day' | 'week' | 'month';

interface TeacherPayrollData {
  teacher_id: string;
  teacher_name: string;
  lessons_taken: number;
  total_hours: number;
  rate_per_lesson: number;
  salary_earned: number;
}

export default function AdminPayroll() {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const { data: teachers, isLoading: teachersLoading } = useTeachers();

  const getDateRange = (period: PeriodFilter) => {
    const now = new Date();
    switch (period) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['admin-payroll', period],
    queryFn: async () => {
      const { start, end } = getDateRange(period);
      
      // Fetch lessons taken in the period
      const { data: lessons, error } = await supabase
        .from('lessons_log')
        .select(`
          teacher_id,
          status,
          scheduled_lessons!inner(duration_minutes)
        `)
        .eq('status', 'Taken')
        .gte('lesson_date', format(start, 'yyyy-MM-dd'))
        .lte('lesson_date', format(end, 'yyyy-MM-dd'));

      if (error) throw error;

      // Aggregate by teacher
      const teacherStats: Record<string, { lessons: number; totalMinutes: number }> = {};
      lessons?.forEach((lesson: any) => {
        const teacherId = lesson.teacher_id;
        if (teacherId) {
          if (!teacherStats[teacherId]) {
            teacherStats[teacherId] = { lessons: 0, totalMinutes: 0 };
          }
          teacherStats[teacherId].lessons += 1;
          teacherStats[teacherId].totalMinutes += lesson.scheduled_lessons?.duration_minutes || 45;
        }
      });

      // Build payroll data for each teacher
      const payroll: TeacherPayrollData[] = (teachers || []).map(teacher => {
        const stats = teacherStats[teacher.teacher_id] || { lessons: 0, totalMinutes: 0 };
        const totalHours = stats.totalMinutes / 60;
        const salaryEarned = totalHours * (teacher.rate_per_lesson || 0);
        
        return {
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.name,
          lessons_taken: stats.lessons,
          total_hours: totalHours,
          rate_per_lesson: teacher.rate_per_lesson || 0,
          salary_earned: salaryEarned,
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
  const activeTeachers = payrollData?.filter(t => t.lessons_taken > 0).length || 0;

  const getPeriodLabel = () => {
    const { start, end } = getDateRange(period);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const exportToCSV = () => {
    if (!payrollData || payrollData.length === 0) return;
    
    const headers = ['Teacher Name', 'Lessons Taken', 'Total Hours', 'Rate/Hour (EGP)', 'Salary Earned (EGP)'];
    const rows = payrollData.map(t => [
      t.teacher_name,
      t.lessons_taken.toString(),
      t.total_hours.toFixed(2),
      t.rate_per_lesson.toString(),
      t.salary_earned.toFixed(2),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Teacher Payroll</h1>
            <p className="text-muted-foreground">{getPeriodLabel()}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['day', 'week', 'month'] as PeriodFilter[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!payrollData?.length}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Teachers</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{activeTeachers}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{totalLessons}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-emerald-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Wallet className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payroll (EGP)</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <p className="text-2xl font-bold text-emerald-400">{formatSalary(totalSalary)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Teacher Salaries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : payrollData && payrollData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead className="text-right">Lessons Taken</TableHead>
                    <TableHead className="text-right">Hours Worked</TableHead>
                    <TableHead className="text-right">Rate/Hour (EGP)</TableHead>
                    <TableHead className="text-right">Salary Earned (EGP)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollData.map((teacher) => (
                    <TableRow key={teacher.teacher_id}>
                      <TableCell className="font-medium">{teacher.teacher_name}</TableCell>
                      <TableCell className="text-right">{teacher.lessons_taken}</TableCell>
                      <TableCell className="text-right">{teacher.total_hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatSalary(teacher.rate_per_lesson)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400">
                        {formatSalary(teacher.salary_earned)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={teacher.lessons_taken > 0 ? 'status-active' : 'status-grace'}
                        >
                          {teacher.lessons_taken > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No payroll data for this period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
