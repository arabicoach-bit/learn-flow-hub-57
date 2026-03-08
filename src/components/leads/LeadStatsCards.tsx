import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Users, CheckCircle, Clock, DollarSign, XCircle, UserCheck, Percent } from 'lucide-react';

interface LeadStats {
  total: number;
  trialBooked: number;
  pending: number;
  priceNegotiation: number;
  lost: number;
  converted: number;
  conversionRate: number;
}

interface LeadStatsCardsProps {
  stats: LeadStats;
}

const statItems = [
  { key: 'total' as const, label: 'Total Leads', icon: Users, color: 'text-primary' },
  { key: 'trialBooked' as const, label: 'Trial Booked', icon: CheckCircle, color: 'text-blue-400' },
  { key: 'pending' as const, label: 'Pending', icon: Clock, color: 'text-amber-400' },
  { key: 'priceNegotiation' as const, label: 'Price Negotiation', icon: DollarSign, color: 'text-purple-400' },
  { key: 'lost' as const, label: 'Lost', icon: XCircle, color: 'text-red-400' },
  { key: 'converted' as const, label: 'Converted', icon: UserCheck, color: 'text-emerald-400' },
];

export function LeadStatsCards({ stats }: LeadStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {statItems.map(({ key, label, icon: Icon, color }) => (
        <Card key={key} className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>{label}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-2xl font-bold">{stats[key]}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardDescription>Conversion Rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-500" />
            <span className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
