import { useState } from 'react';
import { Bell, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { 
  useAllNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, 
  useDeleteReadNotifications, Notification as AppNotification 
} from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatRelativeTime, getNotificationStyles, formatNotificationType } from '@/lib/notification-utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

type FilterTab = 'all' | 'alerts' | 'lessons' | 'trials' | 'packages';

const ALERT_TYPES = ['blocked', 'grace_mode', 'low_balance', 'unmarked_lesson_reminder'];
const ACTION_TYPES = ['blocked', 'grace_mode', 'trial_completed', 'low_balance'];

function parseNotificationField(message: string, field: string): string | null {
  const regex = new RegExp(`${field}:\\s*([^|]+)`);
  const match = message.match(regex);
  return match ? match[1].trim() : null;
}

function NotificationActions({ notification, navigate }: { notification: AppNotification; navigate: (path: string) => void }) {
  const type = notification.type;
  const relatedId = notification.related_id;

  return (
    <div className="flex gap-2 mt-2">
      {relatedId && type !== 'trial_completed' && (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/admin/students/${relatedId}`); }}>
          View Student
        </Button>
      )}
      {(type === 'low_balance' || type === 'grace_mode') && (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/admin/packages'); }}>
          View Packages
        </Button>
      )}
      {type === 'trial_completed' && (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/admin/trial-students'); }}>
          Go to Trial Students
        </Button>
      )}
    </div>
  );
}

function NotificationCard({ notification, onMarkRead, navigate }: { 
  notification: AppNotification; 
  onMarkRead: (id: string) => void; 
  navigate: (path: string) => void;
}) {
  const styles = getNotificationStyles(notification.type);
  
  return (
    <div className={`p-4 rounded-lg border-l-4 transition-all ${
      notification.is_read 
        ? 'bg-muted/20 border-border/30 opacity-60 border-l-border' 
        : `${styles.bgColor} ${styles.borderColor} border-l-current`
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg">{styles.icon}</span>
            <Badge variant="outline" className={styles.badgeClass}>
              {formatNotificationType(notification.type)}
            </Badge>
            {notification.student_name && (
              <span className="font-medium text-sm">{notification.student_name}</span>
            )}
          </div>
          <p className="text-sm mt-1">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatRelativeTime(notification.created_at)}
          </p>
          <NotificationActions notification={notification} navigate={navigate} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!notification.is_read && (
            <>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onMarkRead(notification.notification_id); }}>
                <Check className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonGroup({ date, notifications, onMarkRead, navigate }: {
  date: string;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  navigate: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors cursor-pointer">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="text-lg">✅</span>
          <span className="font-medium text-sm">{notifications.length} Lessons on {date}</span>
          <span className="text-xs text-muted-foreground ml-auto">Click to expand</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 mt-2 ml-4">
          {notifications.map(n => (
            <NotificationCard key={n.notification_id} notification={n} onMarkRead={onMarkRead} navigate={navigate} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useAllNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteRead = useDeleteReadNotifications();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  
  const filteredNotifications = notifications?.filter(n => {
    switch (activeTab) {
      case 'alerts': return ALERT_TYPES.includes(n.type);
      case 'lessons': return n.type === 'lesson_completed';
      case 'trials': return n.type === 'trial_completed';
      case 'packages': return n.type === 'new_package';
      default: return true;
    }
  }) || [];

  // Stats
  const criticalCount = notifications?.filter(n => !n.is_read && (n.type === 'blocked' || n.type === 'grace_mode')).length || 0;
  const actionCount = notifications?.filter(n => !n.is_read && ACTION_TYPES.includes(n.type)).length || 0;
  const lessonCount = notifications?.filter(n => n.type === 'lesson_completed').length || 0;
  const trialCount = notifications?.filter(n => n.type === 'trial_completed').length || 0;
  const packageCount = notifications?.filter(n => n.type === 'new_package').length || 0;

  // Split into action needed vs info
  const needsAction = filteredNotifications.filter(n => !n.is_read && ACTION_TYPES.includes(n.type));
  const infoNotifications = filteredNotifications.filter(n => !(!n.is_read && ACTION_TYPES.includes(n.type)));

  // Group lesson_completed by date
  const groupLessonsByDate = (items: AppNotification[]) => {
    const lessonItems = items.filter(n => n.type === 'lesson_completed');
    const otherItems = items.filter(n => n.type !== 'lesson_completed');
    
    const lessonGroups: Record<string, AppNotification[]> = {};
    lessonItems.forEach(n => {
      const dateKey = format(new Date(n.created_at), 'dd MMM yyyy');
      if (!lessonGroups[dateKey]) lessonGroups[dateKey] = [];
      lessonGroups[dateKey].push(n);
    });

    return { lessonGroups, otherItems };
  };

  const { lessonGroups, otherItems } = groupLessonsByDate(infoNotifications);

  const handleMarkRead = (id: string) => markRead.mutate(id);

  const statChips = [
    { label: `🔴 ${criticalCount} Critical`, count: criticalCount, tab: 'alerts' as FilterTab },
    { label: `🟠 ${actionCount} Action`, count: actionCount, tab: 'alerts' as FilterTab },
    { label: `✅ ${lessonCount} Lessons`, count: lessonCount, tab: 'lessons' as FilterTab },
    { label: `🎓 ${trialCount} Trials`, count: trialCount, tab: 'trials' as FilterTab },
    { label: `📦 ${packageCount} Packages`, count: packageCount, tab: 'packages' as FilterTab },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Bell className="w-7 h-7" /> Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Stay updated with important alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}>
              <Check className="w-4 h-4 mr-1" /> Mark All Read
            </Button>
            <Button variant="outline" size="sm" onClick={() => deleteRead.mutate()} disabled={deleteRead.isPending}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear Read
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-2">
          {statChips.map((chip) => (
            <button key={chip.label} onClick={() => setActiveTab(chip.tab)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:bg-muted/50">
              {chip.label}
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          {([
            { key: 'all', label: 'All' },
            { key: 'alerts', label: '⚠️ Alerts' },
            { key: 'lessons', label: '✅ Lessons' },
            { key: 'trials', label: '🎓 Trials' },
            { key: 'packages', label: '📦 Packages' },
          ] as { key: FilterTab; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Needs Action Section */}
            {needsAction.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    🔴 Needs Action ({needsAction.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {needsAction.map(n => (
                    <NotificationCard key={n.notification_id} notification={n} onMarkRead={handleMarkRead} navigate={navigate} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Information Section */}
            {(otherItems.length > 0 || Object.keys(lessonGroups).length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    📋 Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Grouped lessons */}
                  {Object.entries(lessonGroups).map(([date, items]) => (
                    items.length > 1 ? (
                      <LessonGroup key={date} date={date} notifications={items} onMarkRead={handleMarkRead} navigate={navigate} />
                    ) : (
                      <NotificationCard key={items[0].notification_id} notification={items[0]} onMarkRead={handleMarkRead} navigate={navigate} />
                    )
                  ))}
                  {/* Other info notifications */}
                  {otherItems.map(n => (
                    <NotificationCard key={n.notification_id} notification={n} onMarkRead={handleMarkRead} navigate={navigate} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
