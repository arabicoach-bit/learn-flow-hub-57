import { useState } from 'react';
import { useScheduledLessons, useDeleteScheduledLesson, ScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { WeeklyScheduleCard } from './WeeklyScheduleCard';
import { EditScheduleDialog } from './EditScheduleDialog';
import { UpdateLessonStatusDialog } from './UpdateLessonStatusDialog';
import { Calendar, Clock, CheckCircle2, XCircle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns';
import { toast } from 'sonner';

interface StudentScheduleTabProps {
  studentId: string;
  lessonsUsed?: number;
  lessonsPurchased?: number;
}

export function StudentScheduleTab({ studentId, lessonsUsed = 0, lessonsPurchased = 0 }: StudentScheduleTabProps) {
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const [editLesson, setEditLesson] = useState<ScheduledLesson | null>(null);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const { data: scheduledLessons, isLoading } = useScheduledLessons({ student_id: studentId });
  const deleteLesson = useDeleteScheduledLesson();

  const handleDeleteLesson = async () => {
    if (!deleteLessonId) return;
    try {
      await deleteLesson.mutateAsync({ scheduledLessonId: deleteLessonId });
      toast.success('Lesson deleted successfully');
      setDeleteLessonId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete lesson');
    }
  };

  const getStatusBadge = (status: string, date: string) => {
    const lessonDate = parseISO(date);
    
    if (status === 'completed') {
      return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    }
    if (status === 'absent') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
    }
    
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
  const absentCount = scheduledLessons?.filter(l => l.status === 'absent').length || 0;
  const scheduledCount = scheduledLessons?.filter(l => l.status === 'scheduled').length || 0;
  const totalLessons = scheduledLessons?.length || 0;
  const progressPercent = totalLessons > 0 ? ((completedCount + absentCount) / totalLessons) * 100 : 0;

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
      {/* Weekly Schedule Card with Edit Button */}
      <div className="relative">
        <WeeklyScheduleCard studentId={studentId} />
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 gap-2"
          onClick={() => setIsEditScheduleOpen(true)}
        >
          <Pencil className="w-4 h-4" />
          Edit Schedule
        </Button>
      </div>

      {/* Statistics Card */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{absentCount}</p>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scheduledCount}</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {((completedCount * 0.75)).toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">Total Hours</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <p className="text-2xl font-bold">{totalLessons}</p>
          <p className="text-xs text-muted-foreground">Total Lessons</p>
        </div>
      </div>

      {/* Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-sm font-bold">{completedCount + absentCount} / {totalLessons}</p>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Lessons Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            All Lessons
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
                      <div className="flex gap-1">
                        {/* Edit button - change date/time/duration/status */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary hover:text-primary"
                          onClick={() => setEditLesson(lesson)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {/* Delete button - only for scheduled */}
                        {lesson.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteLessonId(lesson.scheduled_lesson_id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLessonId} onOpenChange={() => setDeleteLessonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled lesson. The wallet will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Lesson</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLesson} disabled={deleteLesson.isPending}>
              {deleteLesson.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                'Delete Lesson'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Lesson Dialog (date/time/duration/status) */}
      {editLesson && (
        <UpdateLessonStatusDialog
          lesson={editLesson}
          open={!!editLesson}
          onOpenChange={(open) => !open && setEditLesson(null)}
          onSuccess={() => setEditLesson(null)}
        />
      )}

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        studentId={studentId}
        open={isEditScheduleOpen}
        onOpenChange={setIsEditScheduleOpen}
      />
    </div>
  );
}
