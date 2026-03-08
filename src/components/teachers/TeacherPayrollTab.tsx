import { useState } from 'react';
import { ChevronRight, Clock, DollarSign, BookOpen, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { useTeacherTotalHours, type TeacherTotalHoursResult } from '@/hooks/use-teacher-total-hours';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatSalary } from '@/lib/wallet-utils';
import { format } from 'date-fns';

interface TeacherPayrollTabProps {
  teacherId: string;
  ratePerLesson: number;
}

interface SalaryHistoryRecord {
  monthLabel: string;
  monthDate: string;
  lessons: number;
  hours: number;
  salary: number;
  isPending: boolean;
}

function useTeacherSalaryHistory(teacherId: string, rate: number) {
  return useQuery({
    queryKey: ['teacher-salary-history', teacherId],
    queryFn: async () => {
      const [{ data: lessons }, { data: trials }] = await Promise.all([
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
      ]);

      const monthMap: Record<string, { monthLabel: string; monthDate: string; lessons: number; minutes: number; trialCount: number }> = {};

      lessons?.forEach((l) => {
        const monthKey = l.scheduled_date.slice(0, 7);
        const monthLabel = format(new Date(monthKey + '-01'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].lessons += 1;
        monthMap[monthKey].minutes += l.duration_minutes || 0;
      });

      trials?.forEach((t) => {
        const monthKey = t.lesson_date.slice(0, 7);
        const monthLabel = format(new Date(monthKey + '-01'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].trialCount += 1;
      });

      const currentMonth = format(new Date(), 'yyyy-MM');

      return Object.values(monthMap)
        .sort((a, b) => b.monthDate.localeCompare(a.monthDate))
        .map((m) => {
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

export function TeacherPayrollTab({ teacherId, ratePerLesson }: TeacherPayrollTabProps) {
  const [payrollFilter, setPayrollFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const payrollRange = getFilterDateRange(payrollFilter);
  const { data: filteredStats } = useTeacherTotalHours(teacherId, payrollRange.startDate, payrollRange.endDate);
  const { data: salaryHistory } = useTeacherSalaryHistory(teacherId, ratePerLesson);

  const summaryCards = [
    {
      label: 'Completed Lessons',
      value: filteredStats?.totalLessons ?? '...',
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Teaching Hours',
      value: filteredStats ? `${filteredStats.totalHours.toFixed(1)}h` : '...',
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Rate / Hour',
      value: formatSalary(ratePerLesson),
      icon: DollarSign,
      color: 'text-muted-foreground',
      bg: 'bg-muted border-border',
    },
    {
      label: 'Salary (EGP)',
      value: filteredStats ? formatSalary(filteredStats.salary) : '...',
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  const allTimeTotals = salaryHistory
    ? {
        lessons: salaryHistory.reduce((s, r) => s + r.lessons, 0),
        hours: salaryHistory.reduce((s, r) => s + r.hours, 0),
        salary: salaryHistory.reduce((s, r) => s + r.salary, 0),
      }
    : null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
          <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
          Payroll Summary
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex items-center justify-end mb-2">
            <YearMonthFilter value={payrollFilter} onChange={setPayrollFilter} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((c) => (
              <Card key={c.label} className={`border ${c.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <c.icon className={`w-4 h-4 ${c.color}`} />
                    <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* History Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Payment Records</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Month</TableHead>
              <TableHead className="text-center">Lessons</TableHead>
              <TableHead className="text-center">Hours</TableHead>
              <TableHead className="text-center">Salary (EGP)</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!salaryHistory?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No salary history yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {salaryHistory.map((record) => (
                  <TableRow key={record.monthDate}>
                    <TableCell className="font-medium">{record.monthLabel}</TableCell>
                    <TableCell className="text-center">{record.lessons}</TableCell>
                    <TableCell className="text-center">{record.hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-center font-medium">{formatSalary(record.salary)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          record.isPending
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }
                      >
                        {record.isPending ? '⏳ Pending' : '✅ Paid'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {allTimeTotals && (
                  <TableRow className="font-bold border-t-2">
                    <TableCell>All Time Total</TableCell>
                    <TableCell className="text-center">{allTimeTotals.lessons}</TableCell>
                    <TableCell className="text-center">{allTimeTotals.hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-center">{formatSalary(allTimeTotals.salary)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
