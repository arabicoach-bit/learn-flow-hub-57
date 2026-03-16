import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, GraduationCap, BookOpen, Clock, Wallet, Gift } from 'lucide-react';
import { Teacher } from '@/hooks/use-teachers';
import { TeacherBatchStats } from '@/hooks/use-teachers-batch-stats';
import { formatSalary } from '@/lib/wallet-utils';

interface UnifiedTeacherStatsProps {
  teachers: Teacher[];
  batchStats: Record<string, TeacherBatchStats> | undefined;
  // Payroll aggregates
  isPayrollLoading: boolean;
  activeTeachers: number;
  totalLessons: number;
  totalHours: number;
  totalSalary: number;
  totalBonus: number;
  totalPay: number;
  totalActiveStudents: number;
}

export function UnifiedTeacherStats({
  teachers,
  batchStats,
  isPayrollLoading,
  activeTeachers,
  totalLessons,
  totalHours,
  totalSalary,
  totalBonus,
  totalPay,
  totalActiveStudents,
}: UnifiedTeacherStatsProps) {
  const totalTeachers = teachers.length;
  const activeCount = teachers.filter((t) => t.is_active !== false).length;
  const inactiveCount = totalTeachers - activeCount;

  const avgRate =
    totalTeachers > 0
      ? teachers.reduce((sum, t) => sum + (t.rate_per_lesson || 0), 0) / totalTeachers
      : 0;

  const row1 = [
    {
      label: 'Total Teachers',
      value: totalTeachers,
      sub: `${activeCount} active · ${inactiveCount} inactive`,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Active Students',
      value: totalActiveStudents,
      sub: 'Assigned across all teachers',
      icon: GraduationCap,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Total Lessons',
      value: totalLessons,
      sub: `${activeTeachers} active teachers`,
      icon: BookOpen,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Total Hours',
      value: `${totalHours.toFixed(1)}h`,
      sub: `Avg rate: ${formatSalary(Math.round(avgRate))}`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  const row2 = [
    {
      label: 'Total Salary',
      value: formatSalary(totalSalary),
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Total Bonus',
      value: formatSalary(totalBonus),
      icon: Gift,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Total Pay',
      value: formatSalary(totalPay),
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {row1.map((c) => (
          <Card key={c.label} className={`border ${c.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              </div>
              {isPayrollLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{c.value}</p>
                  {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {row2.map((c) => (
          <Card key={c.label} className={`border ${c.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              </div>
              {isPayrollLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
