import { DollarSign, PackageIcon, RefreshCw, Sparkles, CheckCircle2, PlayCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/wallet-utils';

interface PackageStatsBarProps {
  paidRevenue: number;
  pendingRevenue: number;
  runningCount: number;
  completedCount: number;
  totalCount: number;
  renewalCount: number;
  newCount: number;
}

const items = [
  { key: 'paidRevenue', label: 'Paid Revenue', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', isCurrency: true },
  { key: 'pendingRevenue', label: 'Pending Revenue', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10', isCurrency: true },
  { key: 'totalCount', label: 'Total', icon: PackageIcon, color: 'text-muted-foreground', bg: 'bg-muted/60' },
  { key: 'runningCount', label: 'In Progress', icon: PlayCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { key: 'completedCount', label: 'Finished', icon: CheckCircle2, color: 'text-muted-foreground', bg: 'bg-muted/60' },
  { key: 'renewalCount', label: 'Renewals', icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'newCount', label: 'New', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
] as const;

export function PackageStatsBar(props: PackageStatsBarProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {items.map((item) => {
        const { key, label, icon: Icon, color, bg } = item;
        const val = props[key];
        const display = 'isCurrency' in item && item.isCurrency ? formatCurrency(val) : val;
        return (
          <div
            key={key}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border ${bg} transition-colors`}
          >
            <div className={`p-1.5 rounded-lg ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <span className="text-lg font-bold leading-tight">{display}</span>
            <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
