import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  GraduationCap, 
  Wallet, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useTodaysTeacherLessons, 
  useTomorrowsTeacherLessons, 
  useWeekTeacherLessons,
  useTeacherMonthlyStats,
  useTeacherStudents,
  usePast7DaysUnmarkedLessons
} from '@/hooks/use-teacher-dashboard';
import { TeacherLessonCard } from '@/components/teacher/TeacherLessonCard';
import { TeacherSalaryCard } from '@/components/teacher/TeacherSalaryCard';
 import { formatSalary } from '@/lib/wallet-utils';
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const teacherId = profile?.teacher_id;

  // Fetch data using new hooks
  const { data: todaysLessons, isLoading: todaysLoading, refetch: refetchToday } = useTodaysTeacherLessons();
  const { data: tomorrowsLessons, isLoading: tomorrowsLoading } = useTomorrowsTeacherLessons();
  const { data: weekLessons, isLoading: weekLoading } = useWeekTeacherLessons();
  const { data: stats, isLoading: statsLoading } = useTeacherMonthlyStats();
  const { data: students, isLoading: studentsLoading } = useTeacherStudents();
  const { data: past7DaysLessons, isLoading: past7DaysLoading, refetch: refetchPast7Days } = usePast7DaysUnmarkedLessons();

  const isLoading = todaysLoading || statsLoading || studentsLoading;

  const graceStudents = students?.filter(s => s.status === 'Grace') || [];
  const blockedStudents = students?.filter(s => s.status === 'Blocked') || [];

  const handleLessonMarked = () => {
    refetchToday();
    refetchPast7Days();
  };

  // Filter past lessons (not including today) for the "pending" section
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

        {/* Performance Stats - Real-time */}
        <Card className="glass-card bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h2 className="font-display font-bold text-lg">My Performance This Month</h2>
            </div>
            {statsLoading ? (
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <BookOpen className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                  <p className="text-3xl font-bold">{stats?.currentMonth?.lessons_taught || 0}</p>
                  <p className="text-sm text-muted-foreground">Lessons Taught</p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <Clock className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                  <p className="text-3xl font-bold">{stats?.currentMonth?.total_hours?.toFixed(1) || 0}</p>
                  <p className="text-sm text-muted-foreground">Teaching Hours</p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <Wallet className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                  <p className="text-3xl font-bold text-emerald-400">
                    {formatSalary(stats?.currentMonth?.salary_earned || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Salary Earned</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card border-emerald-600/20">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="outline"
                onClick={() => navigate('/teacher/students')}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                My Students ({students?.length || 0})
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/teacher/payroll')}
              >
                <Wallet className="w-4 h-4 mr-2" />
                View Payroll
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Lessons */}
        <Card className={`glass-card border-blue-500/20 ${todaysLessons && todaysLessons.length > 0 ? '' : ''}`}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-blue-400">
              <Calendar className="w-5 h-5" />
              Today's Lessons ({todaysLessons?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : todaysLessons && todaysLessons.length > 0 ? (
              <div className="space-y-3">
                {todaysLessons.map((lesson) => (
                  <TeacherLessonCard 
                    key={lesson.scheduled_lesson_id} 
                    lesson={lesson}
                    onLessonMarked={handleLessonMarked}
                  />
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
        {pastUnmarkedLessons.length > 0 && (
          <Card className="glass-card border-orange-500/30 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-5 h-5" />
                Pending Lessons to Mark ({pastUnmarkedLessons.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                These lessons from the past 7 days need to be marked. They will expire after 7 days.
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
                  {/* Group by date */}
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
                        <TeacherLessonCard 
                          key={lesson.scheduled_lesson_id} 
                          lesson={lesson}
                          onLessonMarked={handleLessonMarked}
                          showDate={false}
                          date={lesson.scheduled_date}
                        />
                      ))}
                    </div>
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
                  <TeacherLessonCard 
                    key={lesson.scheduled_lesson_id} 
                    lesson={lesson}
                  />
                ))}
                {tomorrowsLessons.length > 4 && (
                  <p className="text-sm text-center text-muted-foreground">
                    +{tomorrowsLessons.length - 4} more lessons
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No lessons scheduled for tomorrow</p>
            )}
          </CardContent>
        </Card>


        {/* Salary Breakdown */}
        <TeacherSalaryCard />

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
                    <Badge className="status-grace">Grace Period</Badge>
                  </div>
                ))}
                {blockedStudents.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">Contact admin for payment</p>
                    </div>
                    <Badge className="status-blocked">Blocked</Badge>
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
