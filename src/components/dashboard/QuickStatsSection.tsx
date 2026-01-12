import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboardSummary } from '@/hooks/use-admin-dashboard-stats';
import { 
  Target,
  UserPlus,
  Calendar,
  Phone,
  TrendingUp,
  Percent
} from 'lucide-react';

export function QuickStatsSection() {
  const { data: summary, isLoading } = useAdminDashboardSummary();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Target className="w-5 h-5" />
            Quick Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Target className="w-5 h-5" />
          Quick Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Leads */}
          <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-2xl font-bold">{summary.totalLeads}</p>
            <p className="text-xs text-muted-foreground">In pipeline</p>
          </div>

          {/* Trials Scheduled */}
          <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-muted-foreground">Active Follow-ups</span>
            </div>
            <p className="text-2xl font-bold">{summary.pendingFollowups}</p>
            <p className="text-xs text-muted-foreground">Due today</p>
          </div>

          {/* Pending Follow-ups */}
          <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-muted-foreground">Pending Follow-ups</span>
            </div>
            <p className="text-2xl font-bold">{summary.pendingFollowups}</p>
            <p className="text-xs text-muted-foreground">Need action</p>
          </div>

          {/* Conversion Rate */}
          <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold">{summary.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
