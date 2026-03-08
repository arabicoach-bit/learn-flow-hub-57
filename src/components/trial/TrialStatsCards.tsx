import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Users, Clock, CheckCircle, XCircle, UserCheck, TrendingUp } from 'lucide-react';

interface TrialStats {
  total: number;
  scheduled: number;
  completed: number;
  absent: number;
  converted: number;
  pending: number;
  lost: number;
}

interface TrialStatsCardsProps {
  stats: TrialStats;
  conversionRate: string;
}

export function TrialStatsCards({ stats, conversionRate }: TrialStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Total</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Scheduled</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold">{stats.scheduled}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Completed</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold">{stats.completed}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Absent</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-orange-400" />
            <span className="text-2xl font-bold">{stats.absent}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Pending</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-2xl font-bold">{stats.pending}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Converted</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl font-bold">{stats.converted}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Lost</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-2xl font-bold">{stats.lost}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="pb-2"><CardDescription>Conv. Rate</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold">{conversionRate}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
