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
  { key: 'paidRevenue', label: 'Paid', icon: DollarSign, color: 'text-emerald-500', isCurrency: true },
  { key: 'pendingRevenue', label: 'Pending', icon: DollarSign, color: 'text-amber-500', isCurrency: true },
  { key: 'totalCount', label: 'Total', icon: PackageIcon, color: 'text-muted-foreground' },
  { key: 'runningCount', label: 'In Progress', icon: PlayCircle, color: 'text-emerald-500' },
  { key: 'completedCount', label: 'Finished', icon: CheckCircle2, color: 'text-muted-foreground' },
  { key: 'renewalCount', label: 'Renewals', icon: RefreshCw, color: 'text-blue-500' },
  { key: 'newCount', label: 'New', icon: Sparkles, color: 'text-purple-500' },
] as const;

export function PackageStatsBar(props: PackageStatsBarProps) {
  return (
    <div className="flex items-center gap-1 p-2 rounded-lg bg-card border overflow-x-auto">
      {items.map(({ key, label, icon: Icon, color, isCurrency }) => (
        <div
          key={key}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 min-w-fit"
        >
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold">
            {isCurrency ? formatCurrency(props[key]) : props[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
