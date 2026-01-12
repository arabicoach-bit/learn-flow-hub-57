import { useState } from 'react';
import { useScheduledLessons, useCancelScheduledLesson, ScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { RescheduleDialog } from './RescheduleDialog';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, CalendarClock } from 'lucide-react';
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns';
import { toast } from 'sonner';

interface StudentScheduleTabProps {
  studentId: string;
  lessonsUsed?: number;
  lessonsPurchased?: number;
}

export function StudentScheduleTab({ studentId, lessonsUsed = 0, lessonsPurchased = 0 }: StudentScheduleTabProps) {
  const [cancelLessonId, setCancelLessonId] = useState<string | null>(null);
  const [rescheduleLesson, setRescheduleLesson] = useState<ScheduledLesson | null>(null);
  const { data: scheduledLessons, isLoading } = useScheduledLessons({ student_id: studentId });
  const cancelLesson = useCancelScheduledLesson();

  const handleCancelLesson = async () => {
    if (!cancelLessonId) return;
    try {
      await cancelLesson.mutateAsync(cancelLessonId);
      toast.success('Lesson cancelled successfully');
      setCancelLessonId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel lesson');
    }
  };

  const getStatusBadge = (status: string, date: string) => {
    const lessonDate = parseISO(date);
    
    if (status === 'completed') {
      return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    }
    if (status === 'rescheduled') {
      return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300"><AlertCircle className="w-3 h-3 mr-1" />Rescheduled</Badge>;
    }
    
    // Scheduled
    if (isToday(lessonDate)) {
      return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300"><Clock className="w-3 h-3 mr-1" />Today</Badge>;
    }
    if (isFuture(lessonDate)) {
      return <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />Scheduled</Badge>;
    }
    if (isPast(lessonDate)) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    
    return <Badge variant="outline">Scheduled</Badge>;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const completedCount = scheduledLessons?.filter(l => l.status === 'completed').length || 0;
  const scheduledCount = scheduledLessons?.filter(l => l.status === 'scheduled').length || 0;
  const totalLessons = scheduledLessons?.length || 0;
  const progressPercent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Package Progress</p>
              <p className="text-2xl font-bold">{completedCount} / {totalLessons} lessons completed</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{scheduledCount}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </div>
          <Progress value={progressPercent} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Lessons Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!scheduledLessons?.length ? (
            <p className="text-muted-foreground text-center py-8">
              No lessons scheduled yet. Add a package to generate lessons.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledLessons.map((lesson) => (
                  <TableRow 
                    key={lesson.scheduled_lesson_id}
                    className={isToday(parseISO(lesson.scheduled_date)) ? 'bg-amber-500/5' : ''}
                  >
                    <TableCell className="font-medium">
                      {format(parseISO(lesson.scheduled_date), 'EEE, MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{formatTime(lesson.scheduled_time)}</TableCell>
                    <TableCell>{lesson.duration_minutes} mins</TableCell>
                    <TableCell>{lesson.teachers?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(lesson.status, lesson.scheduled_date)}</TableCell>
                    <TableCell>
                      {lesson.status === 'scheduled' && isFuture(parseISO(lesson.scheduled_date)) && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary"
                            onClick={() => setRescheduleLesson(lesson)}
                          >
                            <CalendarClock className="w-4 h-4 mr-1" />
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setCancelLessonId(lesson.scheduled_lesson_id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelLessonId} onOpenChange={() => setCancelLessonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled lesson. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Lesson</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelLesson} disabled={cancelLesson.isPending}>
              {cancelLesson.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Lesson'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      {rescheduleLesson && (
        <RescheduleDialog
          lesson={rescheduleLesson}
          open={!!rescheduleLesson}
          onOpenChange={(open) => !open && setRescheduleLesson(null)}
          onSuccess={() => setRescheduleLesson(null)}
        />
      )}
    </div>
  );
}
