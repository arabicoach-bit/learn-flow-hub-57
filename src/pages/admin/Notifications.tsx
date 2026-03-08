import { useState } from 'react';
import { Bell, Check, Filter } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationCard } from '@/components/notifications/NotificationCard';

type FilterType = 'all' | 'lesson_completed' | 'trial_completed' | 'new_package';

export default function AdminNotifications() {
  const { data: notifications, isLoading } = useNotifications(100);
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = notifications?.filter(n =>
    filter === 'all' ? true : n.type === filter
  );

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Lesson updates, trials & new packages</p>
          </div>
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            <Check className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <Filter className="w-3.5 h-3.5" /> All
            </TabsTrigger>
            <TabsTrigger value="lesson_completed">✅ Lessons</TabsTrigger>
            <TabsTrigger value="trial_completed">🎓 Trials</TabsTrigger>
            <TabsTrigger value="new_package">📦 Packages</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : filtered?.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications</p>
            </div>
          ) : (
            filtered?.map((n) => <NotificationCard key={n.notification_id} notification={n} />)
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
