import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, AlertTriangle, PauseCircle, XCircle, Percent } from 'lucide-react';

interface StudentStatsCardsProps {
  total: number;
  active: number;
  overdue: number;
  tempStop: number;
  left: number;
  retentionRate: number;
}

export function StudentStatsCards({ total, active, overdue, tempStop, left, retentionRate }: StudentStatsCardsProps) {
  const stats = [
    { icon: Users, value: total, label: 'Total Students', color: 'text-muted-foreground' },
    { icon: UserCheck, value: active, label: 'Active', color: 'text-emerald-600' },
    { icon: AlertTriangle, value: overdue, label: 'Overdue', color: 'text-red-600' },
    { icon: PauseCircle, value: tempStop, label: 'Temporary Stop', color: 'text-amber-600' },
    { icon: XCircle, value: left, label: 'Left', color: 'text-red-500' },
    { icon: Percent, value: `${retentionRate}%`, label: 'Retention Rate', color: 'text-blue-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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
