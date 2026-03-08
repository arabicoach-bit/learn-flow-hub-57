import { useEffect } from 'react';
import { 
  Bell, BookOpen, AlertTriangle, Phone, 
  Users, Clock, CheckCircle2, XCircle, 
  Zap, ArrowRight, Wallet, UserCheck
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useCommandCenter } from '@/hooks/use-command-center';
import { usePendingPackages, useActivatePackage } from '@/hooks/use-pending-packages';
import { useNotifications } from '@/hooks/use-notifications';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime, getNotificationStyles, formatNotificationType } from '@/lib/notification-utils';
import { formatCurrency, formatDate } from '@/lib/wallet-utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: cmd, isLoading: cmdLoading } = useCommandCenter();
  const { data: pendingPackages, isLoading: pkgLoading } = usePendingPackages();
  const { data: notifications, isLoading: notifLoading } = useNotifications({ limit: 5 });
  const activatePackage = useActivatePackage();

  // Real-time subscriptions
  useEffect(() => {
    const studentsChannel = supabase
      .channel('dashboard-students')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students' }, () => {
        queryClient.invalidateQueries({ queryKey: ['command-center'] });
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel('dashboard-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        const type = payload.new?.type;
        const studentName = payload.new?.student_name || 'Unknown';
        
        if (type === 'blocked') {
          toast.error(`🚫 Student ${studentName} has LEFT!`, { duration: 10000, action: { label: 'View', onClick: () => navigate('/admin/notifications') } });
        } else if (type === 'grace_mode') {
          toast.warning(`⚠️ Student ${studentName} entered Temporary Stop`, { duration: 5000 });
        } else if (type === 'lesson_completed') {
          toast.success(`✅ Lesson: ${studentName}`, { duration: 4000 });
        } else if (type === 'trial_completed') {
          toast.info(`🎓 Trial done: ${studentName} - update result!`, { duration: 6000 });
        } else if (type === 'new_package') {
          toast.success(`📦 New package: ${studentName}`, { duration: 4000 });
        } else if (type === 'low_balance') {
          toast.warning(`⚠️ Low credit: ${studentName}`, { duration: 5000 });
        }
        
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['command-center'] });
      })
      .subscribe();

    const lessonsChannel = supabase
      .channel('dashboard-lessons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_lessons' }, () => {
        queryClient.invalidateQueries({ queryKey: ['command-center'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(lessonsChannel);
    };
  }, [queryClient, navigate]);

  const todayLabel = format(new Date(), 'EEEE, MMM d, yyyy');

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1">📅 {todayLabel} — What needs your attention today</p>
        </div>

        {/* TODAY'S SNAPSHOT - Top Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cmdLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <ActionCard
                emoji="📚"
                label="Today's Lessons"
                value={cmd?.todaysLessons || 0}
                detail={
                  cmd ? `${cmd.todaysCompleted} done · ${cmd.todaysScheduled} pending` : ''
                }
                variant="blue"
                onClick={() => navigate('/admin/students')}
              />
              <ActionCard
                emoji="🎯"
                label="Unmarked"
                value={cmd?.todaysScheduled || 0}
                detail="Lessons not marked yet"
                variant={cmd?.todaysScheduled ? 'amber' : 'green'}
                onClick={() => navigate('/admin/students')}
              />
              <ActionCard
                emoji="📞"
                label="Overdue Follow-ups"
                value={cmd?.overdueFollowups || 0}
                detail="Leads need contact"
                variant={cmd?.overdueFollowups ? 'red' : 'green'}
                onClick={() => navigate('/admin/leads')}
              />
              <ActionCard
                emoji="🎓"
                label="Today's Trials"
                value={cmd?.todaysTrials || 0}
                detail="Trial lessons today"
                variant="purple"
                onClick={() => navigate('/admin/trial-students')}
              />
            </>
          )}
        </div>

        {/* URGENT ACTIONS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Packages */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center justify-between">
                <span className="flex items-center gap-2">
                  📦 Pending Packages
                  {pendingPackages && pendingPackages.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{pendingPackages.length}</Badge>
                  )}
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/packages')}>
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pkgLoading ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
              ) : pendingPackages && pendingPackages.length > 0 ? (
                <div className="space-y-2">
                  {pendingPackages.slice(0, 3).map((pkg) => (
                    <div key={pkg.package_id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <div>
                        <p className="font-medium text-sm">{pkg.students.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pkg.package_types?.name || 'Custom'} · {formatCurrency(pkg.amount)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                        onClick={() => activatePackage.mutate(pkg.package_id)}
                        disabled={activatePackage.isPending}
                      >
                        {activatePackage.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Activate</>}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">✅ No pending packages</p>
              )}
            </CardContent>
          </Card>

          {/* Low Balance Students */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center justify-between">
                <span className="flex items-center gap-2">
                  ⚠️ Low Balance Students
                  {cmd?.lowBalanceStudents && cmd.lowBalanceStudents.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{cmd.lowBalanceStudents.length}</Badge>
                  )}
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/students')}>
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cmdLoading ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : cmd?.lowBalanceStudents && cmd.lowBalanceStudents.length > 0 ? (
                <div className="space-y-2">
                  {cmd.lowBalanceStudents.slice(0, 5).map((student) => (
                    <div 
                      key={student.student_id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/15 cursor-pointer hover:bg-red-500/10 transition-colors"
                      onClick={() => navigate(`/admin/students/${student.student_id}`)}
                    >
                      <span className="font-medium text-sm">{student.name}</span>
                      <Badge variant={student.wallet_balance <= 0 ? 'destructive' : 'outline'} className="text-xs">
                        {student.wallet_balance} lessons
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">✅ All students have sufficient balance</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* STATUS OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cmdLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : (
            <>
              <MiniStat icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Completed Today" value={cmd?.todaysCompleted || 0} />
              <MiniStat icon={<XCircle className="w-4 h-4 text-red-500" />} label="Absent Today" value={cmd?.todaysAbsent || 0} />
              <MiniStat icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="Temporary Stop" value={cmd?.temporaryStopStudents || 0} />
              <MiniStat icon={<UserCheck className="w-4 h-4 text-purple-500" />} label="Today's Trials" value={cmd?.todaysTrials || 0} />
            </>
          )}
        </div>

        {/* RECENT NOTIFICATIONS */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              🔔 Recent Notifications
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/notifications')}>
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {notifLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((n) => {
                  const styles = getNotificationStyles(n.type);
                  return (
                    <div
                      key={n.notification_id}
                      onClick={() => navigate('/admin/notifications')}
                      className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                        n.is_read ? 'bg-muted/20 border-border/50' : `${styles.bgColor} ${styles.borderColor}`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm">{styles.icon}</span>
                          {n.student_name && <span className="font-medium text-sm">{n.student_name}</span>}
                          <span className="text-sm text-muted-foreground truncate">{n.message}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No notifications yet</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink emoji="📊" label="Quarter Analysis" onClick={() => navigate('/admin/quarter-analysis')} />
          <QuickLink emoji="👩‍🎓" label="Students" onClick={() => navigate('/admin/students')} />
          <QuickLink emoji="👨‍🏫" label="Teachers" onClick={() => navigate('/admin/teachers')} />
          <QuickLink emoji="💰" label="Payroll" onClick={() => navigate('/admin/payroll')} />
        </div>
      </div>
    </AdminLayout>
  );
}

// --- Sub-components ---

function ActionCard({ emoji, label, value, detail, variant, onClick }: {
  emoji: string;
  label: string;
  value: number;
  detail: string;
  variant: 'blue' | 'amber' | 'red' | 'green' | 'purple';
  onClick: () => void;
}) {
  const colors = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    green: 'border-emerald-500/20 bg-emerald-500/5',
    purple: 'border-violet-500/20 bg-violet-500/5',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${colors[variant]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold font-display">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold font-display">{value}</p>
    </div>
  );
}

function QuickLink({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      className="h-auto py-3 flex items-center gap-2 justify-start"
      onClick={onClick}
    >
      <span>{emoji}</span>
      <span className="text-sm">{label}</span>
      <ArrowRight className="w-3 h-3 ml-auto" />
    </Button>
  );
}
