import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTodaysLessons } from '@/hooks/use-lessons';
import { MarkLessonForm } from '@/components/lessons/MarkLessonForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/wallet-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckSquare } from 'lucide-react';

export default function Lessons() {
  const { data: lessons, isLoading } = useTodaysLessons();

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Mark Lessons</h1>
          <p className="text-muted-foreground">Record attendance and lesson status</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mark Lesson Form */}
          <MarkLessonForm />

          {/* Today's Lessons */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Today's Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : lessons?.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No lessons recorded today</p>
                  <p className="text-sm text-muted-foreground mt-2">Use the form to record attendance</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {lessons?.map((lesson) => (
                    <div key={lesson.lesson_id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{lesson.students?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {lesson.classes?.name} • {lesson.teachers?.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDateTime(lesson.date)}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            lesson.status === 'Taken'
                              ? 'status-active'
                              : lesson.status === 'Absent'
                              ? 'status-blocked'
                              : 'status-grace'
                          }
                        >
                          {lesson.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
