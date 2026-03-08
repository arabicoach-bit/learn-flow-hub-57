import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CalendarDays, Users } from 'lucide-react';
import { TrialLessonCalendarCard, type TrialLessonCalendarData } from '@/components/schedule/TrialLessonCalendarCard';

interface TrialLessonCalendarProps {
  teacherId: string;
  /** If true, uses admin context (no RLS teacher filter needed) */
  isAdmin?: boolean;
}

function useTrialLessonCalendarData(teacherId: string, queryKeyPrefix: string) {
  return useQuery({
    queryKey: [queryKeyPrefix, teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_lessons_log')
        .select(`
          trial_lesson_id,
          trial_student_id,
          lesson_date,
          lesson_time,
          duration_minutes,
          status,
          notes,
          teacher_payment_amount,
          trial_students!inner(
            name,
            phone,
            age,
            school,
            year_group,
            interested_program,
            student_level,
            parent_guardian_name
          )
        `)
        .eq('teacher_id', teacherId)
        .order('lesson_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        trial_lesson_id: lesson.trial_lesson_id,
        trial_student_id: lesson.trial_student_id,
        student_name: lesson.trial_students?.name || 'Unknown',
        student_phone: lesson.trial_students?.phone || '',
        lesson_date: lesson.lesson_date,
        lesson_time: lesson.lesson_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        notes: lesson.notes,
        teacher_payment_amount: lesson.teacher_payment_amount,
        age: lesson.trial_students?.age,
        school: lesson.trial_students?.school,
        year_group: lesson.trial_students?.year_group,
        interested_program: lesson.trial_students?.interested_program,
        student_level: lesson.trial_students?.student_level,
        parent_guardian_name: lesson.trial_students?.parent_guardian_name,
      })) as TrialLessonCalendarData[];
    },
    enabled: !!teacherId,
    refetchInterval: 60000,
  });
}

export function TrialLessonCalendar({ teacherId, isAdmin }: TrialLessonCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const queryKey = isAdmin ? 'admin-teacher-trial-calendar' : 'teacher-trial-calendar';
  const { data: trialLessons, isLoading, refetch } = useTrialLessonCalendarData(teacherId, queryKey);

  const lessonsByDate = useMemo(() => {
    if (!trialLessons) return new Map<string, TrialLessonCalendarData[]>();
    const grouped = new Map<string, TrialLessonCalendarData[]>();
    trialLessons.forEach((lesson) => {
      const dateKey = lesson.lesson_date;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(lesson);
    });
    return grouped;
  }, [trialLessons]);

  const selectedDateLessons = useMemo(() => {
    if (!selectedDate || !trialLessons) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return (lessonsByDate.get(dateKey) || []).sort((a, b) =>
      (a.lesson_time || '').localeCompare(b.lesson_time || '')
    );
  }, [selectedDate, lessonsByDate, trialLessons]);

  const getDayContent = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const lessons = lessonsByDate.get(dateKey);
    if (!lessons || lessons.length === 0) return null;
    const hasScheduled = lessons.some(l => l.status === 'scheduled');
    const hasCompleted = lessons.some(l => l.status === 'completed');
    const hasAbsent = lessons.some(l => l.status === 'absent');
    return (
      <div className="flex gap-0.5 mt-0.5">
        {hasScheduled && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
        {hasCompleted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {hasAbsent && <div className="w-1.5 h-1.5 rounded-full bg-destructive" />}
      </div>
    );
  };

  const stats = useMemo(() => {
    if (!trialLessons) return { total: 0, scheduled: 0, completed: 0, absent: 0 };
    return {
      total: trialLessons.length,
      scheduled: trialLessons.filter(l => l.status === 'scheduled').length,
      completed: trialLessons.filter(l => l.status === 'completed').length,
      absent: trialLessons.filter(l => l.status === 'absent').length,
    };
  }, [trialLessons]);

  const isToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-500" />
              Trial Lessons Calendar
            </CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Scheduled: <strong className="text-purple-500">{stats.scheduled}</strong></span>
              <span>Completed: <strong className="text-emerald-600">{stats.completed}</strong></span>
              <span>Absent: <strong className="text-destructive">{stats.absent}</strong></span>
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
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span>Scheduled</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Completed</span></div>
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
            <div className="flex items-center gap-2">
              {isToday && <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Today</Badge>}
              {selectedDateLessons.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" /> {selectedDateLessons.length} trial{selectedDateLessons.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedDateLessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No trial lessons on this date</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {selectedDateLessons.map((lesson) => (
                <TrialLessonCalendarCard
                  key={lesson.trial_lesson_id}
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
