import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { LessonCard } from '@/components/schedule/LessonCard';

interface TeacherCalendarProps {
  teacherId: string;
}

export function TeacherCalendar({ teacherId }: TeacherCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const { data: scheduledLessons, isLoading, refetch } = useScheduledLessons({ teacher_id: teacherId });

  const lessonsByDate = useMemo(() => {
    if (!scheduledLessons) return new Map<string, typeof scheduledLessons>();
    const grouped = new Map<string, typeof scheduledLessons>();
    scheduledLessons.forEach((lesson) => {
      const dateKey = lesson.scheduled_date;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(lesson);
    });
    return grouped;
  }, [scheduledLessons]);

  const selectedDateLessons = useMemo(() => {
    if (!selectedDate || !scheduledLessons) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return (lessonsByDate.get(dateKey) || []).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [selectedDate, lessonsByDate, scheduledLessons]);

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

  const stats = useMemo(() => {
    if (!scheduledLessons) return { total: 0, scheduled: 0, completed: 0 };
    return {
      total: scheduledLessons.length,
      scheduled: scheduledLessons.filter(l => l.status === 'scheduled').length,
      completed: scheduledLessons.filter(l => l.status === 'completed').length,
    };
  }, [scheduledLessons]);

  const isToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-500" />
              My Schedule Calendar
            </CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Scheduled: <strong className="text-emerald-600">{stats.scheduled}</strong></span>
              <span>Completed: <strong className="text-primary">{stats.completed}</strong></span>
            </div>
          </div>
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
