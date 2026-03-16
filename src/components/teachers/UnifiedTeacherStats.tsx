import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, GraduationCap, Clock, Wallet } from 'lucide-react';
import { Teacher } from '@/hooks/use-teachers';
import { formatSalary } from '@/lib/wallet-utils';

interface UnifiedTeacherStatsProps {
  teachers: Teacher[];
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

  const cards = [
    {
      label: 'Teachers',
      value: totalTeachers,
      sub: `${activeCount} active · ${inactiveCount} inactive`,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Students & Lessons',
      value: `${totalActiveStudents} students`,
      sub: `${totalLessons} lessons · ${activeTeachers} active teachers`,
      icon: GraduationCap,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Hours',
      value: `${totalHours.toFixed(1)}h`,
      sub: `Avg ${totalTeachers > 0 ? (totalHours / Math.max(activeTeachers, 1)).toFixed(1) : '0'}h per teacher`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Total Pay',
      value: formatSalary(totalPay),
      sub: `Salary ${formatSalary(totalSalary)} + Bonus ${formatSalary(totalBonus)}`,
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className={`border ${c.bg}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
            {isPayrollLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
