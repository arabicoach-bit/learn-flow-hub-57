import { useState, useMemo } from 'react';
import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { LessonCard } from '@/components/schedule/LessonCard';
import { YearMonthFilter, YearMonthFilterValue, getDefaultFilter, getFilterDateRange } from '@/components/shared/YearMonthFilter';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { useTeacherLiveStats } from '@/hooks/use-teacher-live-stats';
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek } from 'date-fns';
import {
  CalendarDays, Clock, CheckCircle, XCircle, BookOpen,
  Sun, Sunrise, ChevronRight, RefreshCw, TrendingUp,
} from 'lucide-react';

export default function TeacherSchedule() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [calendarFilter, setCalendarFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [activeTab, setActiveTab] = useState('overview');

  const { data: liveStats, isLoading: liveLoading } = useTeacherLiveStats(teacherId || '');
  const { data: allLessons, isLoading: lessonsLoading, refetch } = useScheduledLessons({ teacher_id: teacherId });

  const { startDate, endDate } = getFilterDateRange(calendarFilter);

  // Filtered lessons for calendar view
  const calendarLessons = useMemo(() => {
    if (!allLessons) return [];
    if (!startDate || !endDate) return allLessons;
    return allLessons.filter(l => l.scheduled_date >= startDate && l.scheduled_date <= endDate);
  }, [allLessons, startDate, endDate]);

  // Today's lessons (all statuses)
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Unmarked lessons (scheduled but in the past)
  const unmarkedLessons = useMemo(() =>
    (allLessons || []).filter(l => l.status === 'scheduled' && l.scheduled_date < todayStr).sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    [allLessons, todayStr]);

  const todaysLessons = useMemo(() => {
    if (!allLessons) return [];
    return allLessons
      .filter(l => l.scheduled_date === todayStr)
      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [allLessons, todayStr]);

  // Tomorrow's lessons
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowsLessons = useMemo(() => {
    if (!allLessons) return [];
    return allLessons
      .filter(l => l.scheduled_date === tomorrowStr)
      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [allLessons, tomorrowStr]);

  // This week's lessons grouped by day
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const weekLessonsGrouped = useMemo(() => {
    if (!allLessons) return [];
    const weekLessons = allLessons.filter(l => l.scheduled_date >= weekStart && l.scheduled_date <= weekEnd);
    const grouped = new Map<string, typeof weekLessons>();
    weekLessons.forEach(l => {
      if (!grouped.has(l.scheduled_date)) grouped.set(l.scheduled_date, []);
      grouped.get(l.scheduled_date)!.push(l);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, lessons]) => ({
        date,
        lessons: lessons.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
      }));
  }, [allLessons, weekStart, weekEnd]);

  // Calendar stats
  const calendarStats = useMemo(() => {
    const total = calendarLessons.length;
    const scheduled = calendarLessons.filter(l => l.status === 'scheduled').length;
    const completed = calendarLessons.filter(l => l.status === 'completed').length;
    const absent = calendarLessons.filter(l => l.status === 'absent').length;
    return { total, scheduled, completed, absent };
  }, [calendarLessons]);

  // Calendar day indicators
  const lessonsByDate = useMemo(() => {
    const grouped = new Map<string, typeof calendarLessons>();
    calendarLessons.forEach(l => {
      if (!grouped.has(l.scheduled_date)) grouped.set(l.scheduled_date, []);
      grouped.get(l.scheduled_date)!.push(l);
    });
    return grouped;
  }, [calendarLessons]);

  const selectedDateLessons = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return (lessonsByDate.get(key) || []).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [selectedDate, lessonsByDate]);

  const getDayContent = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const lessons = lessonsByDate.get(key);
    if (!lessons?.length) return null;
    const hasScheduled = lessons.some(l => l.status === 'scheduled');
    const hasCompleted = lessons.some(l => l.status === 'completed');
    const hasAbsent = lessons.some(l => l.status === 'absent');
    return (
      <div className="flex gap-0.5 mt-0.5">
        {hasScheduled && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {hasCompleted && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        {hasAbsent && <div className="w-1.5 h-1.5 rounded-full bg-destructive" />}
      </div>
    );
  };

  if (!teacherId) {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unable to load schedule. Please try again.</p>
        </div>
      </TeacherLayout>
    );
  }

  const todayScheduledCount = todaysLessons.filter(l => l.status === 'scheduled').length;
  const todayCompletedCount = todaysLessons.filter(l => l.status === 'completed').length;
  const selectedIsToday = selectedDate && isToday(selectedDate);

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">My Schedule</h1>
            <p className="text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sun className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todaysLessons.length}</p>
                <p className="text-xs text-muted-foreground">Today's Lessons</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCompletedCount}/{todaysLessons.length}</p>
                <p className="text-xs text-muted-foreground">Completed Today</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveLoading ? '...' : liveStats?.weeklyHours ?? 0}h</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveLoading ? '...' : liveStats?.monthlyLessonsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <Sun className="w-4 h-4" /> Today
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <CalendarDays className="w-4 h-4" /> This Week
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <BookOpen className="w-4 h-4" /> Calendar
            </TabsTrigger>
          </TabsList>

          {/* === TODAY TAB === */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {lessonsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            ) : (
              <>
                {/* Today's Lessons */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sun className="w-5 h-5 text-amber-500" />
                      Today's Lessons
                      <Badge variant="secondary" className="ml-auto">
                        {todayScheduledCount} remaining
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {todaysLessons.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sun className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No lessons scheduled for today</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {todaysLessons.map(lesson => (
                          <LessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onUpdated={() => refetch()} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tomorrow's Preview */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sunrise className="w-5 h-5 text-blue-500" />
                      Tomorrow
                      <Badge variant="outline" className="ml-auto">{tomorrowsLessons.length} lessons</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tomorrowsLessons.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">No lessons tomorrow</p>
                    ) : (
                      <div className="space-y-2">
                        {tomorrowsLessons.map(lesson => (
                          <LessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onUpdated={() => refetch()} readOnly />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* === WEEK TAB === */}
          <TabsContent value="week" className="space-y-4 mt-4">
            {lessonsLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : weekLessonsGrouped.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No lessons this week</p>
                </CardContent>
              </Card>
            ) : (
              weekLessonsGrouped.map(({ date, lessons }) => {
                const d = new Date(date + 'T00:00:00');
                const dayIsToday = isToday(d);
                const dayIsTomorrow = isTomorrow(d);
                const scheduledCount = lessons.filter(l => l.status === 'scheduled').length;
                const completedCount = lessons.filter(l => l.status === 'completed').length;
                const absentCount = lessons.filter(l => l.status === 'absent').length;

                return (
                  <Card key={date} className={`glass-card ${dayIsToday ? 'ring-2 ring-primary/40' : ''}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="font-semibold">{format(d, 'EEEE, MMM d')}</span>
                        {dayIsToday && <Badge className="bg-primary/20 text-primary border-primary/30">Today</Badge>}
                        {dayIsTomorrow && <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Tomorrow</Badge>}
                        <div className="ml-auto flex gap-2 text-xs">
                          {scheduledCount > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" /> {scheduledCount}
                            </span>
                          )}
                          {completedCount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-500">
                              <CheckCircle className="w-3 h-3" /> {completedCount}
                            </span>
                          )}
                          {absentCount > 0 && (
                            <span className="flex items-center gap-1 text-destructive">
                              <XCircle className="w-3 h-3" /> {absentCount}
                            </span>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lessons.map(lesson => (
                        <LessonCard
                          key={lesson.scheduled_lesson_id}
                          lesson={lesson}
                          onUpdated={() => refetch()}
                          readOnly={false}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* === CALENDAR TAB === */}
          <TabsContent value="calendar" className="space-y-6 mt-4">
            {/* Calendar Filter */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <YearMonthFilter value={calendarFilter} onChange={setCalendarFilter} />
            </div>

            {/* Calendar Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="glass-card">
                <CardContent className="p-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-lg font-bold">{calendarStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-lg font-bold">{calendarStats.scheduled}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-lg font-bold">{calendarStats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <div>
                    <p className="text-lg font-bold">{calendarStats.absent}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Widget */}
            <Card className="glass-card">
              <CardContent className="pt-6">
                {lessonsLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={viewMonth}
                    onMonthChange={setViewMonth}
                    className="rounded-md border w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                      month: "space-y-4 w-full",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-12 w-full text-center text-sm p-0 relative",
                      day: "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md flex flex-col items-center justify-center",
                    }}
                    components={{
                      DayContent: ({ date }) => (
                        <div className="flex flex-col items-center">
                          <span>{date.getDate()}</span>
                          {getDayContent(date)}
                        </div>
                      ),
                    }}
                  />
                )}
                <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Scheduled</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span>Completed</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive" /><span>Absent</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Lessons */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
                  </CardTitle>
                  {selectedIsToday && <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Today</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {selectedDateLessons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No lessons on this day</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {selectedDateLessons.map(lesson => (
                      <LessonCard
                        key={lesson.scheduled_lesson_id}
                        lesson={lesson}
                        onUpdated={() => refetch()}
                        readOnly={!selectedIsToday}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeacherLayout>
  );
}
