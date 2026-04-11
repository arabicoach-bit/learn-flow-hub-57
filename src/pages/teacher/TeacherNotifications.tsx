import { useState, useMemo, useRef } from 'react';
import { Bell, Check, Filter, CheckCircle, GraduationCap, Package, Search, Eye, EyeOff, ArrowUp, Inbox } from 'lucide-react';
import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { DatePresetFilter, type DatePreset, getPresetDateRange } from '@/components/shared/DatePresetFilter';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { isToday, isYesterday, isThisWeek, format } from 'date-fns';

type FilterType = 'all' | 'lesson_completed' | 'trial_completed' | 'new_package';
type ReadFilter = 'all' | 'unread' | 'read';

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
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [datePreset, setDatePreset] = useState<DatePreset>('none');
  const [search, setSearch] = useState('');
  const topRef = useRef<HTMLDivElement>(null);

  const presetRange = getPresetDateRange(datePreset);
  const monthRange = getFilterDateRange(dateFilter);
  const startDate = datePreset !== 'none' ? presetRange.start : monthRange.startDate;
  const endDate = datePreset !== 'none' ? presetRange.end : monthRange.endDate;

  // Apply all filters
  const filtered = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter(n => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (readFilter === 'unread' && n.is_read) return false;
      if (readFilter === 'read' && !n.is_read) return false;
      if (startDate && n.created_at < startDate + 'T00:00:00') return false;
      if (endDate && n.created_at > endDate + 'T23:59:59') return false;
      if (search) {
        const q = search.toLowerCase();
        if (!n.student_name?.toLowerCase().includes(q) && !n.message?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [notifications, typeFilter, readFilter, startDate, endDate, search]);

  // Counts from full (non-filtered) set for stats
  const allFiltered = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter(n => {
      if (startDate && n.created_at < startDate + 'T00:00:00') return false;
      if (endDate && n.created_at > endDate + 'T23:59:59') return false;
      return true;
    });
  }, [notifications, startDate, endDate]);

  const totalUnread = allFiltered.filter(n => !n.is_read).length;
  const lessonCount = allFiltered.filter(n => n.type === 'lesson_completed').length;
  const lessonUnread = allFiltered.filter(n => n.type === 'lesson_completed' && !n.is_read).length;
  const trialCount = allFiltered.filter(n => n.type === 'trial_completed').length;
  const trialUnread = allFiltered.filter(n => n.type === 'trial_completed' && !n.is_read).length;
  const packageCount = allFiltered.filter(n => n.type === 'new_package').length;
  const packageUnread = allFiltered.filter(n => n.type === 'new_package' && !n.is_read).length;

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupKeys = Object.keys(grouped);

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <TeacherLayout>
      <div className="space-y-5 animate-fade-in" ref={topRef}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              Notifications
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-sm">{totalUnread} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Updates about your students' lessons and packages</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || totalUnread === 0}
            >
              <Check className="w-4 h-4 mr-1.5" /> Mark All Read
            </Button>
          </div>
        </div>

        {/* Stats Cards - Clickable to filter */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'lesson_completed' as FilterType, label: 'Completed Lessons', count: lessonCount, unread: lessonUnread, icon: CheckCircle, activeColor: 'green' },
            { key: 'trial_completed' as FilterType, label: 'Trial Lessons', count: trialCount, unread: trialUnread, icon: GraduationCap, activeColor: 'blue' },
            { key: 'new_package' as FilterType, label: 'New Packages', count: packageCount, unread: packageUnread, icon: Package, activeColor: 'emerald' },
          ].map(s => {
            const isActive = typeFilter === s.key;
            return (
              <Card
                key={s.key}
                className={`cursor-pointer transition-all border-2 ${isActive
                  ? `border-${s.activeColor}-500/50 bg-${s.activeColor}-500/10`
                  : `border-border hover:border-${s.activeColor}-500/30`
                }`}
                onClick={() => setTypeFilter(isActive ? 'all' : s.key)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${s.activeColor}-500/20 flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-5 h-5 text-${s.activeColor}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{s.count}</p>
                      {s.unread > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{s.unread}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Read/Unread Filter */}
          <Select value={readFilter} onValueChange={v => setReadFilter(v as ReadFilter)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-1.5"><Inbox className="w-3.5 h-3.5" /> All</span>
              </SelectItem>
              <SelectItem value="unread">
                <span className="flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5" /> Unread</span>
              </SelectItem>
              <SelectItem value="read">
                <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Read</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <DatePresetFilter value={datePreset} onChange={setDatePreset} />
          <YearMonthFilter value={dateFilter} onChange={(v) => { setDatePreset('none'); setDateFilter(v); }} />

          {/* Type Filter Tabs */}
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs h-7 gap-1">
                <Filter className="w-3 h-3" /> All
              </TabsTrigger>
              <TabsTrigger value="lesson_completed" className="text-xs h-7">✅ Lessons</TabsTrigger>
              <TabsTrigger value="trial_completed" className="text-xs h-7">🎓 Trials</TabsTrigger>
              <TabsTrigger value="new_package" className="text-xs h-7">📦 Packages</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Active filter summary */}
        {(search || readFilter !== 'all' || typeFilter !== 'all') && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {allFiltered.length} notifications</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
              setSearch('');
              setReadFilter('all');
              setTypeFilter('all');
            }}>
              Clear filters
            </Button>
          </div>
        )}

        {/* Grouped Notification List */}
        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : groupKeys.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-40" />
              <p className="text-lg font-medium text-muted-foreground mb-1">No notifications found</p>
              <p className="text-sm text-muted-foreground">
                {search || readFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Notifications will appear here when lessons are completed or packages are added'}
              </p>
            </div>
          ) : (
            <>
              {groupKeys.map((dateLabel) => {
                const items = grouped[dateLabel];
                const unreadInGroup = items.filter((n: any) => !n.is_read).length;
                return (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-2 mb-3 sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-1">
                      <h3 className="text-sm font-semibold text-muted-foreground">{dateLabel}</h3>
                      <Badge variant="outline" className="text-xs">{items.length}</Badge>
                      {unreadInGroup > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{unreadInGroup} new</Badge>
                      )}
                    </div>
                    <div className="space-y-3">
                      {items.map((n: any) => <NotificationCard key={n.notification_id} notification={n} />)}
                    </div>
                  </div>
                );
              })}

              {/* Back to top */}
              {filtered.length > 10 && (
                <div className="text-center pt-4">
                  <Button variant="ghost" size="sm" onClick={scrollToTop} className="gap-1.5 text-muted-foreground">
                    <ArrowUp className="w-4 h-4" /> Back to top
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
