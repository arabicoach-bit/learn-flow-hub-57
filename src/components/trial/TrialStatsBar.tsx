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
  { key: 'total', label: 'Total', icon: Users, color: 'text-muted-foreground', bg: 'bg-muted/60' },
  { key: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  { key: 'absent', label: 'Absent', icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'converted', label: 'Converted', icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'lost', label: 'Lost', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
] as const;

export function TrialStatsBar({ stats, conversionRate }: TrialStatsBarProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {items.map(({ key, label, icon: Icon, color, bg }) => (
        <div
          key={key}
          className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border ${bg} transition-colors`}
        >
          <div className={`p-1.5 rounded-lg ${bg}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <span className="text-lg font-bold leading-tight">{stats[key]}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border bg-primary/10 transition-colors">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <span className="text-lg font-bold leading-tight">{conversionRate}%</span>
        <span className="text-[11px] text-muted-foreground leading-tight">Conv. Rate</span>
      </div>
    </div>
  );
}
