import { Users, GraduationCap, AlertTriangle, UserPlus, Wallet, Calendar, ArrowRight, Play, TrendingUp, BookOpen, Award } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useNotifications } from '@/hooks/use-notifications';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/wallet-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications(5);
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-10 animate-fade-in">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50 p-8 md:p-12">
          {/* Floating decorative elements */}
          <div className="absolute top-6 right-20 w-3 h-3 rounded-full bg-primary animate-pulse" />
          <div className="absolute top-16 right-40 w-2 h-2 rounded-full bg-accent/60" />
          <div className="absolute bottom-12 right-32 w-4 h-4 rounded-full bg-emerald-500/40" />
          
          {/* Decorative shapes */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-gradient-to-tr from-primary/10 to-accent/5 rounded-full blur-3xl" />
          <div className="absolute -right-10 top-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl" />
          
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-primary font-medium text-sm tracking-wide uppercase">Academy Management</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-tight">
              Empowering{' '}
              <span className="text-gradient">Education</span>
              <br />
              Excellence
            </h1>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-lg">
              Streamline your academy operations with powerful tools for student management, scheduling, and performance tracking.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-6"
                onClick={() => navigate('/students')}
              >
                View Students
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="gap-2 rounded-full border-border/60 hover:bg-muted/50"
                onClick={() => navigate('/reports')}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Play className="w-3 h-3 text-primary fill-primary" />
                </div>
                View Reports
              </Button>
            </div>
          </div>

          {/* Floating stats card */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block">
            <div className="glass-card rounded-xl p-4 border border-border/50 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Students</p>
                  <p className="text-xl font-bold">{stats?.activeStudents || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Award className="w-3 h-3" />
                <span>Growing strong!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold">Quick Overview</h2>
              <p className="text-muted-foreground text-sm">Your academy at a glance</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <BookOpen className="w-4 h-4" />
              View All
            </Button>
          </div>
          
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
        </div>

        {/* Recent Notifications */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">Recent Notifications</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Stay updated with the latest activities</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/notifications')}>
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
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    className={`p-4 rounded-lg border transition-all duration-200 hover:scale-[1.01] ${
                      notification.is_read
                        ? 'bg-muted/30 border-border/50'
                        : 'bg-primary/5 border-primary/20 shadow-sm'
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
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">You're all caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Index;
