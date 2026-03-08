import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, PackageIcon, RefreshCw, Sparkles, CheckCircle2, PlayCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/wallet-utils';

interface PackageStatsCardsProps {
  paidRevenue: number;
  pendingRevenue: number;
  runningCount: number;
  completedCount: number;
  totalCount: number;
  renewalCount: number;
  newCount: number;
}

export function PackageStatsCards({
  paidRevenue, pendingRevenue,
  runningCount, completedCount, totalCount,
  renewalCount, newCount,
}: PackageStatsCardsProps) {
  return (
    <div className="space-y-3">
      {/* Revenue Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(paidRevenue)}</div>
                <p className="text-xs text-muted-foreground">Paid Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingRevenue)}</div>
                <p className="text-xs text-muted-foreground">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Row */}
      <div className="grid grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <PackageIcon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <div className="text-xl font-bold">{totalCount}</div>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <PlayCircle className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
          <div className="text-xl font-bold text-emerald-600">{runningCount}</div>
          <p className="text-[10px] text-muted-foreground">Running</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <div className="text-xl font-bold text-muted-foreground">{completedCount}</div>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <RefreshCw className="h-4 w-4 mx-auto text-blue-600 mb-1" />
          <div className="text-xl font-bold text-blue-600">{renewalCount}</div>
          <p className="text-[10px] text-muted-foreground">Renewals</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <Sparkles className="h-4 w-4 mx-auto text-purple-600 mb-1" />
          <div className="text-xl font-bold text-purple-600">{newCount}</div>
          <p className="text-[10px] text-muted-foreground">New</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
