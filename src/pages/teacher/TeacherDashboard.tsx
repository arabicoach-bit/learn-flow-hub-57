import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckSquare, GraduationCap, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTodaysLessons, useLessons } from '@/hooks/use-lessons';
import { useStudents } from '@/hooks/use-students';
import { useClasses } from '@/hooks/use-classes';
import { TodaysLessonsCard } from '@/components/schedule/TodaysLessonsCard';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const teacherId = profile?.teacher_id;

  // Get classes for this teacher
  const { data: classes, isLoading: classesLoading } = useClasses();
  const myClasses = classes?.filter(c => c.teacher_id === teacherId) || [];

  // Get students for this teacher
  const { data: students, isLoading: studentsLoading } = useStudents();
  const myStudents = students?.filter(s => s.teacher_id === teacherId) || [];
  const activeStudents = myStudents.filter(s => s.status === 'Active');
  const graceStudents = myStudents.filter(s => s.status === 'Grace');
  const blockedStudents = myStudents.filter(s => s.status === 'Blocked');

  // Get lessons this month
  const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: monthLessons, isLoading: lessonsLoading } = useLessons({ teacher_id: teacherId || undefined });
  const thisMonthLessons = monthLessons?.filter(l => 
    l.lesson_date && l.lesson_date >= startDate && l.lesson_date <= endDate && l.status === 'Taken'
  ) || [];

  // Get today's lessons
  const { data: todaysLessons } = useTodaysLessons();
  const myTodaysLessons = todaysLessons?.filter(l => l.teacher_id === teacherId) || [];

  const isLoading = classesLoading || studentsLoading || lessonsLoading;

  return (
    <TeacherLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome, {profile?.full_name || 'Teacher'}!
          </h1>
          <p className="text-muted-foreground">Here's your teaching overview for today.</p>
        </div>

        {/* Quick Actions */}
        <Card className="glass-card border-emerald-600/20">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => navigate('/teacher/mark-lesson')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Mark Lesson
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/teacher/students')}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                View My Students
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              <MetricCard
                title="My Classes"
                value={myClasses.length}
                icon={<Calendar className="w-6 h-6" />}
              />
              <MetricCard
                title="My Students"
                value={myStudents.length}
                icon={<GraduationCap className="w-6 h-6" />}
                variant="success"
              />
              <MetricCard
                title="Lessons This Month"
                value={thisMonthLessons.length}
                icon={<CheckSquare className="w-6 h-6" />}
              />
              <MetricCard
                title="Students in Grace/Blocked"
                value={graceStudents.length + blockedStudents.length}
                icon={<AlertTriangle className="w-6 h-6" />}
                variant={graceStudents.length + blockedStudents.length > 0 ? 'warning' : 'default'}
              />
            </>
          )}
        </div>

        {/* Today's Scheduled Lessons */}
        <TodaysLessonsCard teacherId={teacherId} />

        {/* My Classes */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              My Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : myClasses.length > 0 ? (
              <div className="space-y-3">
                {myClasses.map((cls) => (
                  <div
                    key={cls.class_id}
                    className="p-4 rounded-lg border border-border/50 bg-card/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-sm text-muted-foreground">{cls.schedule || 'No schedule set'}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => navigate('/teacher/mark-lesson')}
                    >
                      Mark Lesson
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No classes assigned yet</p>
            )}
          </CardContent>
        </Card>

        {/* Student Alerts */}
        {(graceStudents.length > 0 || blockedStudents.length > 0) && (
          <Card className="glass-card border-amber-500/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                Student Alerts
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
