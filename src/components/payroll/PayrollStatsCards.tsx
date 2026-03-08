import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BookOpen, Clock, Wallet, Gift, GraduationCap } from 'lucide-react';
import { formatSalary } from '@/lib/wallet-utils';

interface PayrollStatsCardsProps {
  isLoading: boolean;
  activeTeachers: number;
  totalLessons: number;
  totalHours: number;
  totalSalary: number;
  totalBonus: number;
  totalPay: number;
  totalActiveStudents: number;
}

export function PayrollStatsCards({
  isLoading,
  activeTeachers,
  totalLessons,
  totalHours,
  totalSalary,
  totalBonus,
  totalPay,
  totalActiveStudents,
}: PayrollStatsCardsProps) {
  const row1 = [
    {
      label: 'Active Teachers',
      value: activeTeachers,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Active Students',
      value: totalActiveStudents,
      icon: GraduationCap,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Total Lessons',
      value: totalLessons,
      icon: BookOpen,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Total Hours',
      value: `${totalHours.toFixed(1)}h`,
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
      bold: true,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Row 1: People & Activity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {row1.map((c) => (
          <Card key={c.label} className={`border ${c.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Row 2: Financial */}
      <div className="grid grid-cols-3 gap-3">
        {row2.map((c) => (
          <Card key={c.label} className={`border ${c.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              </div>
              {isLoading ? (
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
