import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { useTeachers } from '@/hooks/use-teachers';
import { useStudents } from '@/hooks/use-students';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarDays, User, Clock, Filter } from 'lucide-react';

interface LessonsCalendarProps {
  teacherId?: string;
  studentId?: string;
  showFilters?: boolean;
}

export function LessonsCalendar({ teacherId, studentId, showFilters = true }: LessonsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterTeacher, setFilterTeacher] = useState<string>(teacherId || 'all');
  const [filterStudent, setFilterStudent] = useState<string>(studentId || 'all');
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const { data: teachers } = useTeachers();
  const { data: students } = useStudents();
  const { data: scheduledLessons, isLoading } = useScheduledLessons({
    teacher_id: filterTeacher !== 'all' ? filterTeacher : undefined,
    student_id: filterStudent !== 'all' ? filterStudent : undefined,
  });

  // Group lessons by date for calendar highlighting
  const lessonsByDate = useMemo(() => {
    if (!scheduledLessons) return new Map<string, typeof scheduledLessons>();
    
    const grouped = new Map<string, typeof scheduledLessons>();
    scheduledLessons.forEach((lesson) => {
      const dateKey = lesson.scheduled_date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(lesson);
    });
    return grouped;
  }, [scheduledLessons]);

  // Get lessons for selected date
  const selectedDateLessons = useMemo(() => {
    if (!selectedDate || !scheduledLessons) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return lessonsByDate.get(dateKey) || [];
  }, [selectedDate, lessonsByDate, scheduledLessons]);

  // Custom day content with lesson indicators
  const getDayContent = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const lessons = lessonsByDate.get(dateKey);
    
    if (!lessons || lessons.length === 0) return null;
    
    const hasScheduled = lessons.some(l => l.status === 'scheduled');
    const hasCompleted = lessons.some(l => l.status === 'completed');
    const hasCancelled = lessons.some(l => l.status === 'cancelled' || l.status === 'rescheduled');
    
    return (
      <div className="flex gap-0.5 mt-0.5">
        {hasScheduled && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        {hasCompleted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {hasCancelled && <div className="w-1.5 h-1.5 rounded-full bg-destructive" />}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary/10 text-primary border-primary/30';
      case 'completed': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'rescheduled': return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2 glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Lessons Calendar
            </CardTitle>
            {showFilters && (
              <div className="flex gap-2 flex-wrap">
                <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Teachers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers?.map((t) => (
                      <SelectItem key={t.teacher_id} value={t.teacher_id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStudent} onValueChange={setFilterStudent}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students?.map((s) => (
                      <SelectItem key={s.student_id} value={s.student_id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
          {/* Legend */}
          <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span>Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Lessons */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateLessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No lessons on this date</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDateLessons.map((lesson) => (
                <div
                  key={lesson.scheduled_lesson_id}
                  className={`p-3 rounded-lg border ${getStatusColor(lesson.status || 'scheduled')}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{lesson.students?.name}</p>
                      <p className="text-sm opacity-75">{lesson.teachers?.name}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {lesson.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm opacity-75">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {lesson.scheduled_time?.slice(0, 5)}
                    </span>
                    <span>{lesson.duration_minutes} mins</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
