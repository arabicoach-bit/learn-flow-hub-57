import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek } from 'date-fns';
import {
  CalendarDays, BookOpen, CheckCircle, XCircle, Clock,
  Sun, Sunrise, AlertCircle,
} from 'lucide-react';
import { LessonCard } from '@/components/schedule/LessonCard';
import { YearMonthFilter, YearMonthFilterValue, getDefaultFilter, getFilterDateRange } from '@/components/shared/YearMonthFilter';

interface TeacherCalendarProps {
  teacherId: string;
}

export function TeacherCalendar({ teacherId }: TeacherCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [filter, setFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [activeTab, setActiveTab] = useState('today');

  const { startDate, endDate } = getFilterDateRange(filter);
  const { data: allLessons, isLoading, refetch } = useScheduledLessons({ teacher_id: teacherId });

  // Filtered for calendar/stats
  const calendarLessons = useMemo(() => {
    if (!allLessons) return [];
    if (!startDate || !endDate) return allLessons;
    return allLessons.filter(l => l.scheduled_date >= startDate && l.scheduled_date <= endDate);
  }, [allLessons, startDate, endDate]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Today
  const todaysLessons = useMemo(() =>
    (allLessons || []).filter(l => l.scheduled_date === todayStr).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
    [allLessons, todayStr]);

  // Tomorrow
  const tomorrowsLessons = useMemo(() =>
    (allLessons || []).filter(l => l.scheduled_date === tomorrowStr).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
    [allLessons, tomorrowStr]);

  // Unmarked (scheduled but in the past)
  const unmarkedLessons = useMemo(() =>
    (allLessons || []).filter(l => l.status === 'scheduled' && l.scheduled_date < todayStr).sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    [allLessons, todayStr]);

  // Week grouped
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
  const stats = useMemo(() => {
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
    return (
      <div className="flex gap-0.5 mt-0.5">
        {lessons.some(l => l.status === 'scheduled') && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {lessons.some(l => l.status === 'completed') && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        {lessons.some(l => l.status === 'absent') && <div className="w-1.5 h-1.5 rounded-full bg-destructive" />}
      </div>
    );
  };

  const todayScheduledCount = todaysLessons.filter(l => l.status === 'scheduled').length;
  const todayCompletedCount = todaysLessons.filter(l => l.status === 'completed').length;
  const selectedIsToday = selectedDate && isToday(selectedDate);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Lessons</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Clock className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="w-5 h-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="today" className="gap-1.5">
              <Sun className="w-4 h-4" /> Today
              {todaysLessons.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{todaysLessons.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5">
              <CalendarDays className="w-4 h-4" /> This Week
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> Calendar
            </TabsTrigger>
          </TabsList>
          {activeTab === 'calendar' && <YearMonthFilter value={filter} onChange={setFilter} />}
        </div>

        {/* TODAY */}
        <TabsContent value="today" className="space-y-6 mt-4">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
          ) : (
            <>
              {/* Unmarked Warning */}
              {unmarkedLessons.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      {unmarkedLessons.length} Unmarked Lesson{unmarkedLessons.length !== 1 ? 's' : ''}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                    {unmarkedLessons.map(lesson => (
                      <LessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onUpdated={() => refetch()} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Today's Lessons */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sun className="w-5 h-5 text-amber-500" />
                    Today — {format(new Date(), 'EEEE, MMMM d')}
                    <Badge variant="secondary" className="ml-auto">
                      {todayCompletedCount}/{todaysLessons.length} done · {todayScheduledCount} remaining
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

              {/* Tomorrow */}
              {tomorrowsLessons.length > 0 && (
                <Card className="glass-card opacity-80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                      <Sunrise className="w-4 h-4" />
                      Tomorrow — {format(addDays(new Date(), 1), 'EEEE, MMMM d')}
                      <Badge variant="outline" className="ml-auto">{tomorrowsLessons.length} lessons</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tomorrowsLessons.map(lesson => (
                        <LessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onUpdated={() => refetch()} readOnly />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* WEEK */}
        <TabsContent value="week" className="space-y-4 mt-4">
          {isLoading ? (
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
                        {scheduledCount > 0 && <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> {scheduledCount}</span>}
                        {completedCount > 0 && <span className="flex items-center gap-1 text-emerald-500"><CheckCircle className="w-3 h-3" /> {completedCount}</span>}
                        {absentCount > 0 && <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" /> {absentCount}</span>}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lessons.map(lesson => (
                      <LessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onUpdated={() => refetch()} readOnly={!dayIsToday} />
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* CALENDAR */}
        <TabsContent value="calendar" className="space-y-6 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-500" /> Lessons Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
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
                    <LessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onUpdated={() => refetch()} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
