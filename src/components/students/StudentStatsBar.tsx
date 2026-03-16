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
    { label: 'Total', value: total, icon: Users, color: 'text-muted-foreground' },
    { label: 'Active', value: active, icon: UserCheck, color: 'text-emerald-500' },
    { label: 'Paid', value: paid, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Pending', value: pending, icon: CreditCard, color: 'text-amber-500' },
    { label: 'Renewal', value: renewal, icon: Clock, color: 'text-orange-500' },
    { label: 'Stop', value: stop, icon: PauseCircle, color: 'text-amber-500' },
    { label: 'Left', value: left, icon: XCircle, color: 'text-red-500' },
    { label: 'Retention', value: `${retentionRate}%`, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Attrition', value: `${attritionRate}%`, icon: TrendingDown, color: 'text-red-500' },
  ];

  return (
    <div className="flex items-center gap-1 p-2 rounded-lg bg-card border overflow-x-auto">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 min-w-fit"
        >
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold">{value}</span>
        </div>
      ))}
    </div>
  );
}
