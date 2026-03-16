import { Users, Clock, CheckCircle, XCircle, UserCheck, TrendingUp } from 'lucide-react';

interface TrialStats {
  total: number;
  scheduled: number;
  completed: number;
  absent: number;
  converted: number;
  pending: number;
  lost: number;
}

interface TrialStatsBarProps {
  stats: TrialStats;
  conversionRate: string;
}

const items = [
  { key: 'total', label: 'Total', icon: Users, color: 'text-primary' },
  { key: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-blue-400' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-400' },
  { key: 'absent', label: 'Absent', icon: XCircle, color: 'text-orange-400' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-400' },
  { key: 'converted', label: 'Converted', icon: UserCheck, color: 'text-emerald-400' },
  { key: 'lost', label: 'Lost', icon: XCircle, color: 'text-red-400' },
] as const;

export function TrialStatsBar({ stats, conversionRate }: TrialStatsBarProps) {
  return (
    <div className="flex items-center gap-1 p-2 rounded-lg bg-card border overflow-x-auto">
      {items.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 min-w-fit"
        >
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold">{stats[key]}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 min-w-fit">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-muted-foreground">Conv.</span>
        <span className="text-sm font-semibold">{conversionRate}%</span>
      </div>
    </div>
  );
}
