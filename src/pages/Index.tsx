import { Users, GraduationCap, AlertTriangle, UserPlus, Wallet, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useNotifications } from '@/hooks/use-notifications';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/wallet-utils';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications(5);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your academy overview.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              <MetricCard
                title="Active Students"
                value={stats?.activeStudents || 0}
                icon={<GraduationCap className="w-6 h-6" />}
                variant="success"
              />
              <MetricCard
                title="Grace Period"
                value={stats?.graceStudents || 0}
                icon={<AlertTriangle className="w-6 h-6" />}
                variant="warning"
              />
              <MetricCard
                title="Blocked"
                value={stats?.blockedStudents || 0}
                icon={<AlertTriangle className="w-6 h-6" />}
                variant="danger"
              />
              <MetricCard
                title="Leads This Month"
                value={stats?.totalLeadsThisMonth || 0}
                icon={<UserPlus className="w-6 h-6" />}
              />
              <MetricCard
                title="Pending Renewals"
                value={stats?.pendingRenewals || 0}
                icon={<Wallet className="w-6 h-6" />}
                variant="warning"
              />
              <MetricCard
                title="Today's Lessons"
                value={stats?.todaysLessons || 0}
                icon={<Calendar className="w-6 h-6" />}
              />
            </>
          )}
        </div>

        {/* Recent Notifications */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.is_read
                        ? 'bg-muted/30 border-border/50'
                        : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(notification.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          notification.type === 'blocked'
                            ? 'status-blocked'
                            : notification.type === 'grace_mode'
                            ? 'status-grace'
                            : 'status-new'
                        }
                      >
                        {notification.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No notifications yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Index;
