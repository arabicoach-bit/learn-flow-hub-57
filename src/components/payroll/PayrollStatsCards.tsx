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
  const items = [
    { label: 'Teachers', value: activeTeachers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Students', value: totalActiveStudents, icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Lessons', value: totalLessons, icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Hours', value: `${totalHours.toFixed(1)}h`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Salary', value: formatSalary(totalSalary), icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Bonus', value: formatSalary(totalBonus), icon: Gift, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Total Pay', value: formatSalary(totalPay), icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="grid grid-cols-7 gap-2">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border ${bg} transition-colors`}
        >
          <div className={`p-1.5 rounded-lg ${bg}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-12" />
          ) : (
            <span className="text-lg font-bold leading-tight">{value}</span>
          )}
          <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}
