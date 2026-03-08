import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useTeacherNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, 
  Notification as AppNotification 
} from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRelativeTime, getNotificationStyles, formatNotificationType, parseNotificationDetails } from '@/lib/notification-utils';
import { useNavigate } from 'react-router-dom';

type FilterType = 'all' | 'lesson_completed' | 'trial_completed' | 'new_package';

function hideAedFromMessage(message: string): string {
  return message.replace(/\|\s*💰\s*AED\s*[\d,]+/g, '');
}

function TeacherNotificationCard({ notification }: { notification: AppNotification }) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const styles = getNotificationStyles(notification.type);
  const details = parseNotificationDetails(notification.message);
  const displayMessage = hideAedFromMessage(notification.message);

  const handleNavigate = () => {
    if (!notification.is_read) markRead.mutate(notification.notification_id);
    if (notification.type === 'trial_completed') {
      navigate('/teacher/trial-lessons');
    } else if (notification.related_id) {
      navigate(`/teacher/students`);
    }
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      notification.is_read
        ? 'bg-muted/20 border-border/30 opacity-70'
        : `${styles.bgColor} ${styles.borderColor}`
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{styles.icon}</span>
          <Badge variant="outline" className={styles.badgeClass}>
            {formatNotificationType(notification.type)}
          </Badge>
          {!notification.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(notification.created_at)}
        </span>
      </div>

      {notification.student_name && (
        <h4 className="font-semibold text-base mb-2">{notification.student_name}</h4>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
        {details.teacher && (
          <>
            <span className="text-muted-foreground">Teacher</span>
            <span className="font-medium">{details.teacher}</span>
          </>
        )}
        {details.date && (
          <>
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{details.date}</span>
          </>
        )}
        {details.notes && details.notes !== '-' && (
          <>
            <span className="text-muted-foreground">Notes</span>
            <span className="font-medium">{details.notes}</span>
          </>
        )}
        {details.remaining && (
          <>
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium">{details.remaining}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
        <Button size="sm" variant="outline" onClick={handleNavigate} className="gap-1.5">
          {notification.type === 'trial_completed' ? 'Go to Trials' : 'View'}
        </Button>
        {!notification.is_read && (
          <Button size="sm" variant="ghost" onClick={() => markRead.mutate(notification.notification_id)}>
            <Check className="w-3.5 h-3.5 mr-1" /> Read
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TeacherNotifications() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;
  const { data: notifications, isLoading } = useTeacherNotifications(teacherId);
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = notifications?.filter(n =>
    filter === 'all' ? true : n.type === filter
  );
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Bell className="w-7 h-7" /> Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Updates about your students</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}>
            <Check className="w-4 h-4 mr-1" /> Mark All Read
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
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
            filtered?.map(n => <TeacherNotificationCard key={n.notification_id} notification={n} />)
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
