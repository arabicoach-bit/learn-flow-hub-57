import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CalendarDays, BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react';
import { LessonCard } from '@/components/schedule/LessonCard';
import { YearMonthFilter, YearMonthFilterValue, getDefaultFilter, getFilterDateRange } from '@/components/shared/YearMonthFilter';

interface TeacherCalendarProps {
  teacherId: string;
}

export function TeacherCalendar({ teacherId }: TeacherCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [filter, setFilter] = useState<YearMonthFilterValue>(getDefaultFilter());

  const { startDate, endDate } = getFilterDateRange(filter);

  const { data: allLessons, isLoading, refetch } = useScheduledLessons({ teacher_id: teacherId });

  // Filter lessons by date range
  const scheduledLessons = useMemo(() => {
    if (!allLessons) return [];
    if (!startDate || !endDate) return allLessons;
    return allLessons.filter(l => l.scheduled_date >= startDate && l.scheduled_date <= endDate);
  }, [allLessons, startDate, endDate]);

  const stats = useMemo(() => {
    const total = scheduledLessons.length;
    const scheduled = scheduledLessons.filter(l => l.status === 'scheduled').length;
    const completed = scheduledLessons.filter(l => l.status === 'completed').length;
    const absent = scheduledLessons.filter(l => l.status === 'absent').length;
    return { total, scheduled, completed, absent };
  }, [scheduledLessons]);

  const lessonsByDate = useMemo(() => {
    const grouped = new Map<string, typeof scheduledLessons>();
    scheduledLessons.forEach((lesson) => {
      const dateKey = lesson.scheduled_date;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(lesson);
    });
    return grouped;
  }, [scheduledLessons]);

  const selectedDateLessons = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return (lessonsByDate.get(dateKey) || []).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [selectedDate, lessonsByDate]);

  const getDayContent = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const lessons = lessonsByDate.get(dateKey);
    if (!lessons || lessons.length === 0) return null;
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

  const isToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <YearMonthFilter value={filter} onChange={setFilter} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-500" />
            Lessons Calendar
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

      {/* Selected Day Lessons */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </CardTitle>
            {isToday && <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Today</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {selectedDateLessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No lessons scheduled</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {selectedDateLessons.map((lesson) => (
                <LessonCard
                  key={lesson.scheduled_lesson_id}
                  lesson={lesson}
                  onUpdated={() => refetch()}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
