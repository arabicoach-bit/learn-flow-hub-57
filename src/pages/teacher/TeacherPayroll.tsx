import { useState, useMemo } from 'react';
import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Wallet, DollarSign, Gift, Clock, BookOpen, GraduationCap,
  TrendingUp, Calendar, BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatSalary } from '@/lib/wallet-utils';
import { useTeacherTotalHours } from '@/hooks/use-teacher-total-hours';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function TeacherPayroll() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;
  const [yearFilter, setYearFilter] = useState<string>('all');

  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthYear = format(new Date(), 'yyyy-MM');

  const { data: stats, isLoading: statsLoading } = useTeacherTotalHours(teacherId, currentMonthStart, currentMonthEnd);

  const { data: currentBonus } = useQuery({
    queryKey: ['teacher-bonus', teacherId, currentMonthYear],
    queryFn: async () => {
      if (!teacherId) return null;
      const { data } = await supabase
        .from('teacher_bonuses')
        .select('amount, notes')
        .eq('teacher_id', teacherId)
        .eq('month_year', currentMonthYear)
        .maybeSingle();
      return data;
    },
    enabled: !!teacherId,
  });

  const { data: salaryHistory, isLoading } = useQuery({
    queryKey: ['teacher-salary-history', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const [lessonsRes, trialsRes, teacherRes, bonusesRes] = await Promise.all([
        supabase
          .from('scheduled_lessons')
          .select('scheduled_date, duration_minutes')
          .eq('teacher_id', teacherId)
          .eq('status', 'completed')
          .order('scheduled_date', { ascending: false }),
        supabase
          .from('trial_lessons_log')
          .select('lesson_date')
          .eq('teacher_id', teacherId)
          .eq('status', 'completed'),
        supabase
          .from('teachers')
          .select('rate_per_lesson')
          .eq('teacher_id', teacherId)
          .single(),
        supabase
          .from('teacher_bonuses')
          .select('month_year, amount, notes')
          .eq('teacher_id', teacherId),
      ]);

      const lessons = lessonsRes.data || [];
      const trials = trialsRes.data || [];
      const rate = teacherRes.data?.rate_per_lesson || 0;
      const bonuses = bonusesRes.data || [];
      const currentMonth = format(new Date(), 'yyyy-MM');

      const monthMap: Record<string, { monthLabel: string; monthDate: string; regularLessons: number; minutes: number; trialCount: number }> = {};

      lessons.forEach(l => {
        const monthKey = l.scheduled_date.slice(0, 7);
        const monthLabel = format(new Date(l.scheduled_date + 'T00:00:00'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, regularLessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].regularLessons += 1;
        monthMap[monthKey].minutes += l.duration_minutes || 0;
      });

      trials.forEach(t => {
        const monthKey = t.lesson_date.slice(0, 7);
        const monthLabel = format(new Date(t.lesson_date + 'T00:00:00'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, regularLessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].trialCount += 1;
      });

      return Object.values(monthMap)
        .sort((a, b) => b.monthDate.localeCompare(a.monthDate))
        .map(m => {
          const regularHours = m.minutes / 60;
          const trialHours = m.trialCount * 0.5;
          const totalHours = regularHours + trialHours;
          const salary = Math.round(totalHours * rate * 100) / 100;
          const bonus = bonuses.find(b => b.month_year === m.monthDate);
          const bonusAmount = bonus?.amount || 0;
          return {
            monthLabel: m.monthLabel,
            monthDate: m.monthDate,
            regularLessons: m.regularLessons,
            trialLessons: m.trialCount,
            totalLessons: m.regularLessons + m.trialCount,
            regularHours,
            trialHours,
            hours: totalHours,
            salary,
            bonus: bonusAmount,
            bonusNotes: bonus?.notes || null,
            totalPay: salary + bonusAmount,
            isPending: m.monthDate === currentMonth,
          };
        });
    },
    enabled: !!teacherId,
  });

  const currentBonusAmount = currentBonus?.amount || 0;
  const estimatedTotal = (stats?.salary || 0) + currentBonusAmount;

  // Year options
  const availableYears = useMemo(() => {
    if (!salaryHistory) return [];
    const years = [...new Set(salaryHistory.map(r => r.monthDate.slice(0, 4)))];
    return years.sort((a, b) => b.localeCompare(a));
  }, [salaryHistory]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (!salaryHistory) return [];
    if (yearFilter === 'all') return salaryHistory;
    return salaryHistory.filter(r => r.monthDate.startsWith(yearFilter));
  }, [salaryHistory, yearFilter]);

  // Totals for filtered
  const totals = useMemo(() => {
    return filteredHistory.reduce((acc, r) => ({
      lessons: acc.lessons + r.totalLessons,
      regularLessons: acc.regularLessons + r.regularLessons,
      trialLessons: acc.trialLessons + r.trialLessons,
      hours: acc.hours + r.hours,
      salary: acc.salary + r.salary,
      bonus: acc.bonus + r.bonus,
      totalPay: acc.totalPay + r.totalPay,
    }), { lessons: 0, regularLessons: 0, trialLessons: 0, hours: 0, salary: 0, bonus: 0, totalPay: 0 });
  }, [filteredHistory]);

  // Chart data (last 6 months or filtered)
  const chartData = useMemo(() => {
    const data = [...filteredHistory].reverse().slice(-12);
    return data.map(r => ({
      month: r.monthLabel.replace(' ', '\n'),
      salary: r.salary,
      bonus: r.bonus,
      total: r.totalPay,
    }));
  }, [filteredHistory]);

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">My Payroll</h1>
          <p className="text-muted-foreground">View your earnings, bonuses, and payment history</p>
        </div>

        {/* Current Month Summary */}
        <Card className="glass-card border-emerald-600/20">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              {format(new Date(), 'MMMM yyyy')} — Current Month
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 ml-auto">
                ⏳ Pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <div className="space-y-4">
                {/* Main metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="text-center p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" /> Regular</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats?.regularLessons || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{(stats?.regularHours || 0).toFixed(1)}h</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-600/10 border border-purple-600/20">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><GraduationCap className="w-3 h-3" /> Trials</p>
                    <p className="text-2xl font-bold text-purple-400">{stats?.trialLessons || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{(stats?.trialHours || 0).toFixed(1)}h</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Total Hours</p>
                    <p className="text-2xl font-bold text-emerald-400">{(stats?.totalHours || 0).toFixed(1)}h</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                    <p className="text-xs text-muted-foreground mb-1">Salary</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatSalary(stats?.salary || 0)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatSalary(stats?.ratePerHour || 0)}/hr</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-600/10 border border-amber-600/20">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><Gift className="w-3 h-3" /> Bonus</p>
                    <p className="text-2xl font-bold text-amber-400">{formatSalary(currentBonusAmount)}</p>
                    {currentBonus?.notes && <p className="text-[10px] text-muted-foreground truncate">{currentBonus.notes}</p>}
                  </div>
                  <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> Total Pay</p>
                    <p className="text-2xl font-bold text-primary">{formatSalary(estimatedTotal)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings Chart */}
        {chartData.length > 1 && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Earnings Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number, name: string) => [formatSalary(value), name === 'salary' ? 'Salary' : name === 'bonus' ? 'Bonus' : 'Total']}
                    />
                    <Bar dataKey="salary" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} name="salary" />
                    <Bar dataKey="bonus" stackId="a" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} name="bonus" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />Salary</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(45, 93%, 47%)' }} />Bonus</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Salary History */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="font-display flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Salary History
              </CardTitle>
              {availableYears.length > 1 && (
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-center">Regular</TableHead>
                      <TableHead className="text-center">Trials</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Hours</TableHead>
                      <TableHead className="text-center">Salary</TableHead>
                      <TableHead className="text-center">Bonus</TableHead>
                      <TableHead className="text-center">Total Pay</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((record) => (
                      <TableRow key={record.monthDate} className={record.isPending ? 'bg-amber-500/5' : ''}>
                        <TableCell className="font-medium whitespace-nowrap">{record.monthLabel}</TableCell>
                        <TableCell className="text-center">{record.regularLessons}</TableCell>
                        <TableCell className="text-center">
                          {record.trialLessons > 0 ? (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">{record.trialLessons}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center font-medium">{record.totalLessons}</TableCell>
                        <TableCell className="text-center">{record.hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-center font-semibold text-emerald-400">{formatSalary(record.salary)}</TableCell>
                        <TableCell className="text-center">
                          {record.bonus > 0 ? (
                            <span className="text-amber-400 font-medium" title={record.bonusNotes || undefined}>
                              {formatSalary(record.bonus)}
                              {record.bonusNotes && <span className="text-[10px] ml-1">💬</span>}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center font-bold text-primary">{formatSalary(record.totalPay)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={
                            record.isPending
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          }>
                            {record.isPending ? '⏳ Pending' : '✅ Paid'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/30 font-bold border-t-2">
                      <TableCell>{yearFilter === 'all' ? 'All Time' : yearFilter} Total</TableCell>
                      <TableCell className="text-center">{totals.regularLessons}</TableCell>
                      <TableCell className="text-center">{totals.trialLessons}</TableCell>
                      <TableCell className="text-center">{totals.lessons}</TableCell>
                      <TableCell className="text-center">{totals.hours.toFixed(1)}h</TableCell>
                      <TableCell className="text-center text-emerald-400">{formatSalary(totals.salary)}</TableCell>
                      <TableCell className="text-center text-amber-400">{formatSalary(totals.bonus)}</TableCell>
                      <TableCell className="text-center text-primary">{formatSalary(totals.totalPay)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No salary history yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
