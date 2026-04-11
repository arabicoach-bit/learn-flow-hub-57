import { useState, useMemo } from 'react';
import { Bell, Check, Filter, CheckCircle, GraduationCap, Package, Search, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { DatePresetFilter, type DatePreset, getPresetDateRange } from '@/components/shared/DatePresetFilter';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { useTeachers } from '@/hooks/use-teachers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

type FilterType = 'all' | 'lesson_completed' | 'trial_completed' | 'new_package';
type ReadFilter = 'all' | 'unread' | 'read';

const PAGE_SIZE = 30;

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

export default function AdminNotifications() {
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [page, setPage] = useState(1);

  const { startDate, endDate } = getFilterDateRange(dateFilter);
  const { data: teachers } = useTeachers();

  const { data: notifications, isLoading } = useNotifications({
    type: typeFilter !== 'all' ? typeFilter : undefined,
    startDate,
    endDate,
    teacherId: teacherFilter !== 'all' ? teacherFilter : null,
  });

  const markAllRead = useMarkAllNotificationsRead();

  // Apply client-side filters: search + read/unread
  const filtered = useMemo(() => {
    if (!notifications) return [];
    let result = notifications;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.student_name?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q));
    }
    if (readFilter === 'unread') result = result.filter(n => !n.is_read);
    else if (readFilter === 'read') result = result.filter(n => n.is_read);
    return result;
  }, [notifications, searchQuery, readFilter]);

  // Summary counts (from full filtered list, not paginated)
  const unreadCount = filtered.filter(n => !n.is_read).length;
  const lessonCount = filtered.filter(n => n.type === 'lesson_completed').length;
  const trialCount = filtered.filter(n => n.type === 'trial_completed').length;
  const packageCount = filtered.filter(n => n.type === 'new_package').length;
  const lessonUnread = filtered.filter(n => n.type === 'lesson_completed' && !n.is_read).length;
  const trialUnread = filtered.filter(n => n.type === 'trial_completed' && !n.is_read).length;
  const packageUnread = filtered.filter(n => n.type === 'new_package' && !n.is_read).length;

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset page on filter change
  const handleFilterChange = (setter: Function) => (value: any) => {
    setter(value);
    setPage(1);
  };

  const grouped = useMemo(() => groupByDate(paginated), [paginated]);

  return (
    <AdminLayout>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card
            className={`cursor-pointer transition-all border-2 ${typeFilter === 'lesson_completed' ? 'border-green-500/50 bg-green-500/10' : 'border-border hover:border-green-500/30'}`}
            onClick={() => handleFilterChange(setTypeFilter)(typeFilter === 'lesson_completed' ? 'all' : 'lesson_completed')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lessonCount}</p>
                <p className="text-xs text-muted-foreground">Completed Lessons</p>
                {lessonUnread > 0 && <Badge variant="destructive" className="text-[10px] mt-1 px-1.5 py-0">{lessonUnread} new</Badge>}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all border-2 ${typeFilter === 'trial_completed' ? 'border-blue-500/50 bg-blue-500/10' : 'border-border hover:border-blue-500/30'}`}
            onClick={() => handleFilterChange(setTypeFilter)(typeFilter === 'trial_completed' ? 'all' : 'trial_completed')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trialCount}</p>
                <p className="text-xs text-muted-foreground">Trial Lessons</p>
                {trialUnread > 0 && <Badge variant="destructive" className="text-[10px] mt-1 px-1.5 py-0">{trialUnread} new</Badge>}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all border-2 ${typeFilter === 'new_package' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border hover:border-emerald-500/30'}`}
            onClick={() => handleFilterChange(setTypeFilter)(typeFilter === 'new_package' ? 'all' : 'new_package')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{packageCount}</p>
                <p className="text-xs text-muted-foreground">New Packages</p>
                {packageUnread > 0 && <Badge variant="destructive" className="text-[10px] mt-1 px-1.5 py-0">{packageUnread} new</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <YearMonthFilter value={dateFilter} onChange={handleFilterChange(setDateFilter)} />

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-[160px] h-8 text-xs pl-8"
            />
          </div>

          <Select value={teacherFilter} onValueChange={handleFilterChange(setTeacherFilter)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers?.filter(t => t.is_active).map(t => (
                <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Read/Unread toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden h-8">
            <button
              onClick={() => handleFilterChange(setReadFilter)('all')}
              className={`px-3 h-full text-xs transition-colors ${readFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >All</button>
            <button
              onClick={() => handleFilterChange(setReadFilter)('unread')}
              className={`px-3 h-full text-xs flex items-center gap-1 transition-colors border-l ${readFilter === 'unread' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            ><Eye className="w-3 h-3" /> Unread</button>
            <button
              onClick={() => handleFilterChange(setReadFilter)('read')}
              className={`px-3 h-full text-xs flex items-center gap-1 transition-colors border-l ${readFilter === 'read' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            ><EyeOff className="w-3 h-3" /> Read</button>
          </div>

          <Tabs value={typeFilter} onValueChange={handleFilterChange(setTypeFilter) as any}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7 gap-1">
                <Filter className="w-3 h-3" /> All
              </TabsTrigger>
              <TabsTrigger value="lesson_completed" className="text-xs h-7">✅ Completed</TabsTrigger>
              <TabsTrigger value="trial_completed" className="text-xs h-7">🎓 Trials</TabsTrigger>
              <TabsTrigger value="new_package" className="text-xs h-7">📦 Packages</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {paginated.length} of {filtered.length} notifications
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
        </div>

        {/* Grouped Notification List */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? `No notifications matching "${searchQuery}"` : 'No notifications for this period'}
              </p>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
