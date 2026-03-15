import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Clock, PauseCircle, XCircle, Percent, CreditCard, CheckCircle } from 'lucide-react';

interface StudentStatsCardsProps {
  total: number;
  active: number;
  paid: number;
  pending: number;
  renewal: number;
  stop: number;
  left: number;
  retentionRate: number;
}

export function StudentStatsCards({ total, active, paid, pending, renewal, stop, left, retentionRate }: StudentStatsCardsProps) {
  const stats = [
    { icon: Users, value: total, label: 'Total Students', color: 'text-muted-foreground' },
    { icon: UserCheck, value: active, label: 'Active', color: 'text-emerald-600' },
    { icon: CheckCircle, value: paid, label: 'Paid', color: 'text-emerald-500' },
    { icon: CreditCard, value: pending, label: 'Pending', color: 'text-amber-600' },
    { icon: Clock, value: renewal, label: 'Renewal', color: 'text-orange-600' },
    { icon: PauseCircle, value: stop, label: 'Stop', color: 'text-amber-600' },
    { icon: XCircle, value: left, label: 'Left', color: 'text-red-500' },
    { icon: Percent, value: `${retentionRate}%`, label: 'Retention Rate', color: 'text-blue-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {stats.map(({ icon: Icon, value, label, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
