import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, CreditCard, Clock, PauseCircle, XCircle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface StudentStatsCardsProps {
  total: number;
  active: number;
  paid: number;
  pending: number;
  renewal: number;
  stop: number;
  left: number;
}

export function StudentStatsCards({ total, active, paid, pending, renewal, stop, left }: StudentStatsCardsProps) {
  // Retention = Active / Total (students who are still active)
  const retentionRate = total > 0 ? Math.round((active / total) * 100) : 0;
  // Attrition = (Stop + Left) / Total
  const attritionRate = total > 0 ? Math.round(((stop + left) / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Row 1: Key headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-[11px] text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-emerald-500/10">
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{active}</div>
                <p className="text-[11px] text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{retentionRate}%</div>
                <p className="text-[11px] text-muted-foreground">Retention Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-red-500/10">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{attritionRate}%</div>
                <p className="text-[11px] text-muted-foreground">Attrition Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Payment + status breakdown */}
      <div className="grid grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <CheckCircle className="h-3.5 w-3.5 mx-auto text-emerald-500 mb-1" />
            <div className="text-lg font-bold text-emerald-500">{paid}</div>
            <p className="text-[10px] text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <CreditCard className="h-3.5 w-3.5 mx-auto text-amber-600 mb-1" />
            <div className="text-lg font-bold text-amber-600">{pending}</div>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <Clock className="h-3.5 w-3.5 mx-auto text-orange-600 mb-1" />
            <div className="text-lg font-bold text-orange-600">{renewal}</div>
            <p className="text-[10px] text-muted-foreground">Renewal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <PauseCircle className="h-3.5 w-3.5 mx-auto text-amber-500 mb-1" />
            <div className="text-lg font-bold text-amber-500">{stop}</div>
            <p className="text-[10px] text-muted-foreground">Stop</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <XCircle className="h-3.5 w-3.5 mx-auto text-red-500 mb-1" />
            <div className="text-lg font-bold text-red-500">{left}</div>
            <p className="text-[10px] text-muted-foreground">Left</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
