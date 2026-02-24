import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  GraduationCap, 
  Wallet, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useTodaysTeacherLessons, 
  useTomorrowsTeacherLessons, 
  useTeacherStudents,
  usePast7DaysUnmarkedLessons
} from '@/hooks/use-teacher-dashboard';
import { useTodaysTrialLessons, usePendingTrialLessons } from '@/hooks/use-teacher-trial-lessons';
import { TeacherLessonCard } from '@/components/teacher/TeacherLessonCard';
import { TrialLessonCard } from '@/components/teacher/TrialLessonCard';
import { format, formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const teacherId = profile?.teacher_id;

  const { data: todaysLessons, isLoading: todaysLoading, refetch: refetchToday } = useTodaysTeacherLessons();
  const { data: tomorrowsLessons, isLoading: tomorrowsLoading } = useTomorrowsTeacherLessons();
  const { data: students, isLoading: studentsLoading } = useTeacherStudents();
  const { data: past7DaysLessons, isLoading: past7DaysLoading, refetch: refetchPast7Days } = usePast7DaysUnmarkedLessons();
  const { data: todaysTrialLessons, isLoading: trialTodayLoading, refetch: refetchTrialToday } = useTodaysTrialLessons();
  const { data: pendingTrialLessons, isLoading: pendingTrialLoading, refetch: refetchPendingTrial } = usePendingTrialLessons();

  const graceStudents = students?.filter(s => s.status === 'Temporary Stop') || [];
  const blockedStudents = students?.filter(s => s.status === 'Left') || [];

  const handleLessonMarked = () => {
    refetchToday();
    refetchPast7Days();
    refetchTrialToday();
    refetchPendingTrial();
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const pastUnmarkedLessons = past7DaysLessons?.filter(l => l.scheduled_date < today) || [];

  return (
    <TeacherLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome back, {profile?.full_name || 'Teacher'}!
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Quick Actions */}
        <Card className="glass-card border-emerald-600/20">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={() => navigate('/teacher/students')}>
                <GraduationCap className="w-4 h-4 mr-2" />
                My Students ({students?.length || 0})
              </Button>
              <Button variant="outline" onClick={() => navigate('/teacher/payroll')}>
                <Wallet className="w-4 h-4 mr-2" />
                View Payroll & Stats
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Lessons */}
        <Card className="glass-card border-blue-500/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-blue-400">
              <Calendar className="w-5 h-5" />
              Today's Lessons ({(todaysLessons?.length || 0) + (todaysTrialLessons?.length || 0)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysLoading || trialTodayLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (todaysLessons && todaysLessons.length > 0) || (todaysTrialLessons && todaysTrialLessons.length > 0) ? (
              <div className="space-y-3">
                {todaysLessons?.map((lesson) => (
                  <TeacherLessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onLessonMarked={handleLessonMarked} />
                ))}
                {todaysTrialLessons?.map((lesson) => (
                  <TrialLessonCard key={lesson.trial_lesson_id} lesson={lesson} onLessonMarked={handleLessonMarked} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No lessons scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past 7 Days Unmarked Lessons */}
        {(pastUnmarkedLessons.length > 0 || (pendingTrialLessons && pendingTrialLessons.length > 0)) && (
          <Card className="glass-card border-orange-500/30 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-5 h-5" />
                Pending Lessons to Mark ({pastUnmarkedLessons.length + (pendingTrialLessons?.length || 0)})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                These lessons from the past 7 days need to be marked.
              </p>
            </CardHeader>
            <CardContent>
              {past7DaysLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(
                    pastUnmarkedLessons.reduce((acc, lesson) => {
                      const date = lesson.scheduled_date;
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(lesson);
                      return acc;
                    }, {} as Record<string, typeof pastUnmarkedLessons>)
                  ).map(([date, lessons]) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-orange-400">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(date), 'EEEE, MMMM d')}
                        <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
                          {formatDistanceToNow(new Date(date), { addSuffix: true })}
                        </Badge>
                      </div>
                      {lessons.map((lesson) => (
                        <TeacherLessonCard key={lesson.scheduled_lesson_id} lesson={lesson} onLessonMarked={handleLessonMarked} showDate={false} date={lesson.scheduled_date} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {pendingTrialLessons && pendingTrialLessons.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
                    <Users className="w-4 h-4" />
                    Pending Trial Lessons
                  </div>
                  {pendingTrialLessons.map((lesson) => (
                    <TrialLessonCard key={lesson.trial_lesson_id} lesson={lesson} onLessonMarked={handleLessonMarked} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tomorrow's Lessons */}
        <Card className="glass-card border-green-500/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-green-400">
              <Calendar className="w-5 h-5" />
              Tomorrow's Lessons ({tomorrowsLessons?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tomorrowsLoading ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : tomorrowsLessons && tomorrowsLessons.length > 0 ? (
              <div className="space-y-3">
                {tomorrowsLessons.slice(0, 4).map((lesson) => (
                  <TeacherLessonCard key={lesson.scheduled_lesson_id} lesson={lesson} />
                ))}
                {tomorrowsLessons.length > 4 && (
                  <p className="text-sm text-center text-muted-foreground">+{tomorrowsLessons.length - 4} more lessons</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No lessons scheduled for tomorrow</p>
            )}
          </CardContent>
        </Card>

        {/* Student Alerts */}
        {(graceStudents.length > 0 || blockedStudents.length > 0) && (
          <Card className="glass-card border-amber-500/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                Student Alerts ({graceStudents.length + blockedStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {graceStudents.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">Wallet: {student.wallet_balance} lessons</p>
                    </div>
                    <Badge className="status-grace">Temporary Stop</Badge>
                  </div>
                ))}
                {blockedStudents.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">Contact admin</p>
                    </div>
                    <Badge className="status-blocked">Left</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
