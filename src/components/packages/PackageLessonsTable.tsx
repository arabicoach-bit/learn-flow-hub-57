import { useState } from 'react';
import { useScheduledLessons, useUpdateScheduledLesson, useAddScheduledLesson, useDeleteScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface PackageLessonsTableProps {
  packageId: string;
  studentId: string;
  teacherId: string;
  lessonDuration: number;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  completed: 'status-active',
  cancelled: 'status-blocked',
  rescheduled: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
};

function formatTime12(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function getDayName(dateStr: string) {
  return format(new Date(dateStr + 'T00:00:00'), 'EEEE');
}

function formatDate(dateStr: string) {
  return format(new Date(dateStr + 'T00:00:00'), 'dd MMM yyyy');
}

export function PackageLessonsTable({ packageId, studentId, teacherId, lessonDuration }: PackageLessonsTableProps) {
  const { data: lessons, isLoading } = useScheduledLessons({ package_id: packageId });
  const updateLesson = useUpdateScheduledLesson();
  const addLesson = useAddScheduledLesson();
  const deleteLesson = useDeleteScheduledLesson();

  const [editLesson, setEditLesson] = useState<{
    scheduled_lesson_id: string;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes: number;
    status: string;
  } | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '18:00',
    duration_minutes: lessonDuration,
  });

  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);

  const handleEditSave = async () => {
    if (!editLesson) return;
    try {
      await updateLesson.mutateAsync({
        scheduledLessonId: editLesson.scheduled_lesson_id,
        scheduled_date: editLesson.scheduled_date,
        scheduled_time: editLesson.scheduled_time + ':00',
        duration_minutes: editLesson.duration_minutes,
        status: editLesson.status,
      });
      toast.success('Lesson updated successfully');
      setEditLesson(null);
    } catch {
      toast.error('Failed to update lesson');
    }
  };

  const handleAdd = async () => {
    try {
      await addLesson.mutateAsync({
        package_id: packageId,
        student_id: studentId,
        teacher_id: teacherId,
        scheduled_date: addForm.scheduled_date,
        scheduled_time: addForm.scheduled_time + ':00',
        duration_minutes: addForm.duration_minutes,
      });
      toast.success('Lesson added successfully');
      setIsAddOpen(false);
      setAddForm({
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: '18:00',
        duration_minutes: lessonDuration,
      });
    } catch {
      toast.error('Failed to add lesson');
    }
  };

  const handleDelete = async () => {
    if (!deleteLessonId) return;
    try {
      await deleteLesson.mutateAsync(deleteLessonId);
      toast.success('Lesson deleted');
      setDeleteLessonId(null);
    } catch {
      toast.error('Failed to delete lesson');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  const scheduledCount = lessons?.filter(l => l.status === 'scheduled').length || 0;
  const completedCount = lessons?.filter(l => l.status === 'completed').length || 0;
  const cancelledCount = lessons?.filter(l => l.status === 'cancelled').length || 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-3 text-sm">
          <span className="text-muted-foreground">
            Total: <strong>{lessons?.length || 0}</strong>
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            Scheduled: <strong>{scheduledCount}</strong>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Completed: <strong>{completedCount}</strong>
          </span>
          {cancelledCount > 0 && (
            <span className="text-red-600 dark:text-red-400">
              Cancelled: <strong>{cancelledCount}</strong>
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} className="gap-1">
          <Plus className="w-3 h-3" />
          Add Lesson
        </Button>
      </div>

      {!lessons?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">No scheduled lessons for this package.</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson, index) => (
                <TableRow key={lesson.scheduled_lesson_id} className={lesson.status === 'cancelled' ? 'opacity-50' : ''}>
                  <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                  <TableCell className="font-medium">{getDayName(lesson.scheduled_date)}</TableCell>
                  <TableCell>{formatDate(lesson.scheduled_date)}</TableCell>
                  <TableCell>{formatTime12(lesson.scheduled_time)}</TableCell>
                  <TableCell>{lesson.duration_minutes} mins</TableCell>
                  <TableCell>{lesson.teachers?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLES[lesson.status] || ''}>
                      {lesson.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditLesson({
                          scheduled_lesson_id: lesson.scheduled_lesson_id,
                          scheduled_date: lesson.scheduled_date,
                          scheduled_time: lesson.scheduled_time.slice(0, 5),
                          duration_minutes: lesson.duration_minutes,
                          status: lesson.status,
                        })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteLessonId(lesson.scheduled_lesson_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Lesson Dialog */}
      <Dialog open={!!editLesson} onOpenChange={(open) => { if (!open) setEditLesson(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Lesson</DialogTitle>
          </DialogHeader>
          {editLesson && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" />Date</Label>
                  <Input
                    type="date"
                    value={editLesson.scheduled_date}
                    onChange={(e) => setEditLesson({ ...editLesson, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Clock className="w-3 h-3" />Time</Label>
                  <Input
                    type="time"
                    value={editLesson.scheduled_time}
                    onChange={(e) => setEditLesson({ ...editLesson, scheduled_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (mins)</Label>
                  <Input
                    type="number"
                    value={editLesson.duration_minutes}
                    onChange={(e) => setEditLesson({ ...editLesson, duration_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editLesson.status} onValueChange={(v) => setEditLesson({ ...editLesson, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLesson(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={updateLesson.isPending}>
              {updateLesson.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lesson to Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" />Date</Label>
                <Input
                  type="date"
                  value={addForm.scheduled_date}
                  onChange={(e) => setAddForm({ ...addForm, scheduled_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="w-3 h-3" />Time</Label>
                <Input
                  type="time"
                  value={addForm.scheduled_time}
                  onChange={(e) => setAddForm({ ...addForm, scheduled_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duration (mins)</Label>
              <Input
                type="number"
                value={addForm.duration_minutes}
                onChange={(e) => setAddForm({ ...addForm, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addLesson.isPending}>
              {addLesson.isPending ? 'Adding...' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLessonId} onOpenChange={(open) => { if (!open) setDeleteLessonId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scheduled lesson? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLesson.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
