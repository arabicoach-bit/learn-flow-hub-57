import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClasses } from '@/hooks/use-classes';
import { useStudents } from '@/hooks/use-students';
import { TeacherCalendar } from '@/components/calendar/TeacherCalendar';
import { Calendar, Users, Clock, CalendarDays, List } from 'lucide-react';

export default function TeacherSchedule() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: students, isLoading: studentsLoading } = useStudents();
  
  const myClasses = classes?.filter(c => c.teacher_id === teacherId) || [];
  const isLoading = classesLoading || studentsLoading;

  const getStudentCount = (classId: string) => {
    return students?.filter(s => s.class_id === classId).length || 0;
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

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Schedule</h1>
          <p className="text-muted-foreground">View your lessons calendar and class schedule</p>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              My Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <TeacherCalendar teacherId={teacherId} />
          </TabsContent>

          <TabsContent value="classes">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  My Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                  </div>
                ) : myClasses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myClasses.map((cls) => (
                      <div
                        key={cls.class_id}
                        className="p-6 rounded-lg border border-border/50 bg-card/50"
                      >
                        <h3 className="text-lg font-semibold mb-3">{cls.name}</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{cls.schedule || 'Schedule not set'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{getStudentCount(cls.class_id)} students</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No classes assigned yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeacherLayout>
  );
}
