import { useState, useMemo } from 'react';
import { Bell, Check, Filter, CheckCircle, GraduationCap, Package } from 'lucide-react';
import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { isToday, isYesterday, isThisWeek, format, parseISO } from 'date-fns';

type FilterType = 'all' | 'lesson_completed' | 'trial_completed' | 'new_package';

function groupByDate(notifications: any[]) {
  const groups: Record<string, typeof notifications> = {};
  for (const n of notifications) {
    const date = new Date(n.created_at);
    let label: string;
    if (isToday(date)) label = 'Today';
    else if (isYesterday(date)) label = 'Yesterday';
    else if (isThisWeek(date)) label = format(date, 'EEEE');
    else label = format(date, 'dd MMM yyyy');
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function TeacherNotifications() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;
  const { data: notifications, isLoading } = useTeacherNotifications(teacherId);
  const markAllRead = useMarkAllNotificationsRead();
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>(getDefaultFilter());

  const { startDate, endDate } = getFilterDateRange(dateFilter);

  // Apply filters
  const filtered = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter(n => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (startDate && n.created_at < startDate + 'T00:00:00') return false;
      if (endDate && n.created_at > endDate + 'T23:59:59') return false;
      return true;
    });
  }, [notifications, typeFilter, startDate, endDate]);

  const unreadCount = filtered.filter(n => !n.is_read).length;
  const lessonCount = filtered.filter(n => n.type === 'lesson_completed').length;
  const trialCount = filtered.filter(n => n.type === 'trial_completed').length;
  const packageCount = filtered.filter(n => n.type === 'new_package').length;

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <TeacherLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Updates about your students</p>
          </div>
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            <Check className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card
            className={`cursor-pointer transition-all border-2 ${typeFilter === 'lesson_completed' ? 'border-green-500/50 bg-green-500/10' : 'border-border hover:border-green-500/30'}`}
            onClick={() => setTypeFilter(typeFilter === 'lesson_completed' ? 'all' : 'lesson_completed')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lessonCount}</p>
                <p className="text-xs text-muted-foreground">Completed Lessons</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all border-2 ${typeFilter === 'trial_completed' ? 'border-blue-500/50 bg-blue-500/10' : 'border-border hover:border-blue-500/30'}`}
            onClick={() => setTypeFilter(typeFilter === 'trial_completed' ? 'all' : 'trial_completed')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trialCount}</p>
                <p className="text-xs text-muted-foreground">Trial Lessons</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all border-2 ${typeFilter === 'new_package' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border hover:border-emerald-500/30'}`}
            onClick={() => setTypeFilter(typeFilter === 'new_package' ? 'all' : 'new_package')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{packageCount}</p>
                <p className="text-xs text-muted-foreground">New Packages</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <YearMonthFilter value={dateFilter} onChange={setDateFilter} />

          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7 gap-1">
                <Filter className="w-3 h-3" /> All
              </TabsTrigger>
              <TabsTrigger value="lesson_completed" className="text-xs h-7">✅ Lessons</TabsTrigger>
              <TabsTrigger value="trial_completed" className="text-xs h-7">🎓 Trials</TabsTrigger>
              <TabsTrigger value="new_package" className="text-xs h-7">📦 Packages</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Grouped Notification List */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications for this period</p>
            </div>
          ) : (
            Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{dateLabel}</h3>
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.map((n: any) => <NotificationCard key={n.notification_id} notification={n} />)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
