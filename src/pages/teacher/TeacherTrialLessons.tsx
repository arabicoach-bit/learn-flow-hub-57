import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, Check, X, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrialLessonCard } from '@/components/teacher/TrialLessonCard';
import { format } from 'date-fns';

interface TrialLessonRow {
  trial_lesson_id: string;
  trial_student_id: string;
  lesson_date: string;
  lesson_time: string | null;
  duration_minutes: number;
  status: string;
  notes: string | null;
  teacher_payment_amount: number | null;
  trial_students: { name: string } | null;
}

function useTeacherAllTrialLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-all-trial-lessons', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

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
          trial_students!inner(name)
        `)
        .eq('teacher_id', teacherId)
        .order('lesson_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        trial_lesson_id: lesson.trial_lesson_id,
        trial_student_id: lesson.trial_student_id,
        student_name: lesson.trial_students?.name || 'Unknown',
        lesson_date: lesson.lesson_date,
        lesson_time: lesson.lesson_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        notes: lesson.notes,
        teacher_payment_amount: lesson.teacher_payment_amount,
      }));
    },
    enabled: !!teacherId,
    refetchInterval: 60000,
  });
}

export default function TeacherTrialLessons() {
  const { data: allLessons, isLoading, refetch } = useTeacherAllTrialLessons();

  const scheduled = allLessons?.filter(l => l.status === 'scheduled') || [];
  const completed = allLessons?.filter(l => l.status === 'completed') || [];
  const absent = allLessons?.filter(l => l.status === 'cancelled') || [];

  const formatTime = (time: string | null) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleLessonMarked = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </TeacherLayout>
    );
  }

  const isEmpty = !allLessons || allLessons.length === 0;

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Trial Lessons</h1>
          <p className="text-muted-foreground">
            View and manage trial lessons assigned to you by the admin.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduled.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completed.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{absent.length}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isEmpty ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trial Lessons Assigned</h3>
              <p className="text-muted-foreground">
                When the admin assigns trial students to you, their lessons will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="scheduled" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scheduled">
                Scheduled ({scheduled.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completed.length})
              </TabsTrigger>
              <TabsTrigger value="absent">
                Absent ({absent.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scheduled" className="space-y-3 mt-4">
              {scheduled.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No scheduled trial lessons.
                  </CardContent>
                </Card>
              ) : (
                scheduled.map((lesson) => (
                  <div key={lesson.trial_lesson_id} className="space-y-1">
                    <p className="text-xs text-muted-foreground ml-1">
                      {format(new Date(lesson.lesson_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <TrialLessonCard
                      lesson={lesson}
                      onLessonMarked={handleLessonMarked}
                    />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {completed.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No completed trial lessons yet.
                  </CardContent>
                </Card>
              ) : (
                completed.map((lesson) => (
                  <Card key={lesson.trial_lesson_id} className="border-emerald-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{lesson.student_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(lesson.lesson_date), 'MMM d, yyyy')} • {formatTime(lesson.lesson_time)} • {lesson.duration_minutes} min
                          </p>
                          {lesson.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">"{lesson.notes}"</p>
                          )}
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400">Completed</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="absent" className="space-y-3 mt-4">
              {absent.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No absent trial lessons.
                  </CardContent>
                </Card>
              ) : (
                absent.map((lesson) => (
                  <Card key={lesson.trial_lesson_id} className="border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{lesson.student_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(lesson.lesson_date), 'MMM d, yyyy')} • {formatTime(lesson.lesson_time)} • {lesson.duration_minutes} min
                          </p>
                          {lesson.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">"{lesson.notes}"</p>
                          )}
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-400">Absent</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </TeacherLayout>
  );
}
