import { Users, UserCheck, CreditCard, Clock, PauseCircle, XCircle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface StudentStatsBarProps {
  total: number;
  active: number;
  paid: number;
  pending: number;
  renewal: number;
  stop: number;
  left: number;
}

export function StudentStatsBar({ total, active, paid, pending, renewal, stop, left }: StudentStatsBarProps) {
  const retentionRate = total > 0 ? Math.round((active / total) * 100) : 0;
  const attritionRate = total > 0 ? Math.round(((stop + left) / total) * 100) : 0;

  const items = [
    { label: 'Total', value: total, icon: Users, color: 'text-muted-foreground', bg: 'bg-muted/60' },
    { label: 'Active', value: active, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Paid', value: paid, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pending', value: pending, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Renewal', value: renewal, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Stop', value: stop, icon: PauseCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Left', value: left, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Retention', value: `${retentionRate}%`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Attrition', value: `${attritionRate}%`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="grid grid-cols-9 gap-2">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border ${bg} transition-colors`}
        >
          <div className={`p-1.5 rounded-lg ${bg}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <span className="text-lg font-bold leading-tight">{value}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}
