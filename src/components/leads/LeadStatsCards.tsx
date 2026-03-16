import { Users, Clock, DollarSign, XCircle, UserCheck, Percent } from 'lucide-react';

interface LeadStats {
  total: number;
  pending: number;
  priceNegotiation: number;
  lost: number;
  converted: number;
  conversionRate: number;
}

interface LeadStatsCardsProps {
  stats: LeadStats;
}

const items = [
  { key: 'total' as const, label: 'Total Leads', icon: Users, color: 'text-muted-foreground', bg: 'bg-muted/60' },
  { key: 'converted' as const, label: 'Converted', icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'pending' as const, label: 'Pending', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'priceNegotiation' as const, label: 'Price Neg.', icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'lost' as const, label: 'Lost', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
];

export function LeadStatsCards({ stats }: LeadStatsCardsProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
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
      <div className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border bg-emerald-500/10 transition-colors">
        <div className="p-1.5 rounded-lg bg-emerald-500/10">
          <Percent className="w-4 h-4 text-emerald-500" />
        </div>
        <span className="text-lg font-bold leading-tight">{stats.conversionRate.toFixed(1)}%</span>
        <span className="text-[11px] text-muted-foreground leading-tight">Conv. Rate</span>
      </div>
    </div>
  );
}
