import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatSalary } from '@/lib/wallet-utils';
import { useTeacherTotalHours } from '@/hooks/use-teacher-total-hours';

export default function TeacherPayroll() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: stats, isLoading: statsLoading } = useTeacherTotalHours(teacherId, currentMonthStart, currentMonthEnd);

  const { data: salaryHistory, isLoading } = useQuery({
    queryKey: ['teacher-salary-history', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
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
      const currentMonth = format(new Date(), 'yyyy-MM');

      const monthMap: Record<string, { monthLabel: string; monthDate: string; lessons: number; minutes: number; trialCount: number }> = {};

      lessons?.forEach(l => {
        const monthKey = l.scheduled_date.slice(0, 7);
        const monthLabel = format(new Date(l.scheduled_date + 'T00:00:00'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].lessons += 1;
        monthMap[monthKey].minutes += l.duration_minutes || 0;
      });

      trials?.forEach(t => {
        const monthKey = t.lesson_date.slice(0, 7);
        const monthLabel = format(new Date(t.lesson_date + 'T00:00:00'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].trialCount += 1;
      });

      return Object.values(monthMap)
        .sort((a, b) => b.monthDate.localeCompare(a.monthDate))
        .map(m => {
          const regularHours = m.minutes / 60;
          const trialHours = m.trialCount * 0.5;
          const totalHours = regularHours + trialHours;
          return {
            monthLabel: m.monthLabel,
            monthDate: m.monthDate,
            lessons: m.lessons + m.trialCount,
            hours: totalHours,
            salary: Math.round(totalHours * rate * 100) / 100,
            isPending: m.monthDate === currentMonth,
          };
        });
    },
    enabled: !!teacherId,
  });

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Payroll</h1>
          <p className="text-muted-foreground">View your earnings and payment history</p>
        </div>

        <Card className="glass-card border-emerald-600/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              {format(new Date(), 'MMMM yyyy')} — Current Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                  <p className="text-sm text-muted-foreground mb-1">Lessons</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats?.totalLessons || 0}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                  <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
                  <p className="text-3xl font-bold text-emerald-400">{(stats?.totalHours || 0).toFixed(1)}h</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                  <p className="text-sm text-muted-foreground mb-1">Estimated Earnings</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatSalary(stats?.salary || 0)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              Salary History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : salaryHistory && salaryHistory.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="text-center">Lessons</th>
                      <th className="text-center">Hours</th>
                      <th className="text-center">Salary</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryHistory.map((record) => (
                      <tr key={record.monthDate}>
                        <td className="font-medium">{record.monthLabel}</td>
                        <td className="text-center">{record.lessons}</td>
                        <td className="text-center">{record.hours.toFixed(1)}h</td>
                        <td className="text-center font-semibold text-emerald-400">{formatSalary(record.salary)}</td>
                        <td className="text-center">
                          <Badge variant="outline" className={
                            record.isPending
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          }>
                            {record.isPending ? '⏳ Pending' : '✅ Paid'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-muted/30">
                      <td>All Time Total</td>
                      <td className="text-center">{salaryHistory.reduce((s, r) => s + r.lessons, 0)}</td>
                      <td className="text-center">{salaryHistory.reduce((s, r) => s + r.hours, 0).toFixed(1)}h</td>
                      <td className="text-center text-emerald-400">{formatSalary(salaryHistory.reduce((s, r) => s + r.salary, 0))}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No salary history yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
