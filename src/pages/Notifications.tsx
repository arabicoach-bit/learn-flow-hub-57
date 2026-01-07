import { Bell, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/wallet-utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications(50);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'blocked': return 'status-blocked';
      case 'grace_mode': return 'status-grace';
      case 'low_balance': return 'status-warning bg-amber-500/20 text-amber-400';
      default: return 'status-new';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Notifications</h1>
            <p className="text-muted-foreground">Stay updated with important alerts</p>
          </div>
          <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <Check className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
        </div>

        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : notifications?.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications?.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    notification.is_read
                      ? 'bg-muted/20 border-border/30 opacity-60'
                      : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  }`}
                  onClick={() => !notification.is_read && markRead.mutate(notification.notification_id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatDateTime(notification.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTypeBadgeClass(notification.type)}>
                        {notification.type.replace('_', ' ')}
                      </Badge>
                      {!notification.is_read && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
