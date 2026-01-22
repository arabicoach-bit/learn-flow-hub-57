import { useEffect } from 'react';
import { Users, GraduationCap, AlertTriangle, UserPlus, Wallet, Bell } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useNotifications } from '@/hooks/use-notifications';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime, getNotificationStyles, formatNotificationType } from '@/lib/notification-utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StudentStatsSection } from '@/components/dashboard/StudentStatsSection';
import { TeacherPerformanceSection } from '@/components/dashboard/TeacherPerformanceSection';
import { QuickStatsSection } from '@/components/dashboard/QuickStatsSection';
import { PendingPackagesWidget } from '@/components/admin/PendingPackagesWidget';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications(5);

  // Set up real-time subscriptions for dashboard updates
  useEffect(() => {
    // Subscribe to students table changes for live stat updates
    const studentsChannel = supabase
      .channel('dashboard-students')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          // Refresh dashboard metrics when student status changes
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['admin-student-stats'] });
        }
      )
      .subscribe();

    // Subscribe to notifications for real-time alerts
    const notificationsChannel = supabase
      .channel('dashboard-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          // Show toast notification for critical alerts
          if (payload.new?.type === 'blocked') {
            toast.error(
              `🚫 Student ${payload.new.student_name || 'Unknown'} has been BLOCKED!`,
              {
                duration: 10000,
                action: {
                  label: 'View',
                  onClick: () => navigate('/notifications'),
                },
              }
            );
          } else if (payload.new?.type === 'grace_mode') {
            toast.warning(
              `⚠️ Student ${payload.new.student_name || 'Unknown'} entered grace period`,
              {
                duration: 5000,
              }
            );
          }
          
          // Refresh notifications list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [queryClient, navigate]);

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your academy overview.</p>
        </div>

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
            </>
          )}
        </div>

        {/* Pending Packages Widget */}
        <PendingPackagesWidget />

        {/* Quick Statistics - Leads & Trials */}
        <QuickStatsSection />

        {/* Student Statistics Section */}
        <StudentStatsSection />

        {/* Teacher Performance Section */}
        <TeacherPerformanceSection />

        {/* Recent Notifications */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Notifications
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
              View All
            </Button>
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
                {notifications.map((notification) => {
                  const styles = getNotificationStyles(notification.type);
                  
                  return (
                    <div
                      key={notification.notification_id}
                      onClick={() => navigate('/notifications')}
                      className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                        notification.is_read
                          ? 'bg-muted/30 border-border/50'
                          : `${styles.bgColor} ${styles.borderColor}`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{styles.icon}</span>
                            {notification.student_name && (
                              <span className="font-medium text-sm">{notification.student_name}</span>
                            )}
                          </div>
                          <p className="text-sm">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={styles.badgeClass}>
                            {formatNotificationType(notification.type)}
                          </Badge>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No notifications yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
