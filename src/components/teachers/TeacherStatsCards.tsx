import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, UserX, Clock, Wallet } from 'lucide-react';
import { Teacher } from '@/hooks/use-teachers';
import { TeacherBatchStats } from '@/hooks/use-teachers-batch-stats';
import { formatSalary } from '@/lib/wallet-utils';

interface TeacherStatsCardsProps {
  teachers: Teacher[];
  batchStats: Record<string, TeacherBatchStats> | undefined;
}

export function TeacherStatsCards({ teachers, batchStats }: TeacherStatsCardsProps) {
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter((t) => t.is_active !== false).length;
  const inactiveTeachers = totalTeachers - activeTeachers;

  // Aggregate across all teachers
  let totalStudents = 0;
  let totalHours = 0;
  let totalSalary = 0;

  if (batchStats) {
    Object.values(batchStats).forEach((s) => {
      totalStudents += s.activeStudents;
      totalHours += s.monthlyHours + s.trialLessons * 0.5;
      totalSalary += s.monthlySalary;
    });
  }

  const avgRate =
    totalTeachers > 0
      ? teachers.reduce((sum, t) => sum + (t.rate_per_lesson || 0), 0) / totalTeachers
      : 0;

  const cards = [
    {
      label: 'Total Teachers',
      value: totalTeachers,
      sub: `${activeTeachers} active · ${inactiveTeachers} inactive`,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Active Students',
      value: totalStudents,
      sub: 'Assigned across all teachers',
      icon: UserCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Monthly Hours',
      value: `${totalHours.toFixed(1)}h`,
      sub: `Avg rate: ${formatSalary(Math.round(avgRate))}`,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Monthly Salary',
      value: formatSalary(totalSalary),
      sub: 'All teachers combined',
      icon: Wallet,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className={`border ${c.bg}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
