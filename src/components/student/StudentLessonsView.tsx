import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { WeeklyScheduleCard } from '@/components/schedule/WeeklyScheduleCard';
import { EditScheduleDialog } from '@/components/schedule/EditScheduleDialog';
import { UpdateLessonStatusDialog } from '@/components/schedule/UpdateLessonStatusDialog';
import { useUpdateScheduledLesson, useDeleteScheduledLesson, ScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { useStudentLessonStats } from '@/hooks/use-student-lesson-stats';
import { toast } from 'sonner';
import {
  Calendar, Clock, Check, X, Edit2, Save, Loader2,
  MessageSquare, AlertTriangle, PenLine, Pencil, Trash2, CheckCircle2, XCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isToday, isFuture, isPast } from 'date-fns';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

interface StudentLessonsViewProps {
  studentId: string;
  studentName: string;
  walletBalance: number;
  role: 'admin' | 'teacher';
  teacherId?: string;
}

export function StudentLessonsView({ studentId, studentName, walletBalance, role, teacherId }: StudentLessonsViewProps) {
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ date: '', time: '', duration: '' });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const [editLesson, setEditLesson] = useState<ScheduledLesson | null>(null);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const updateLesson = useUpdateScheduledLesson();
  const deleteLesson = useDeleteScheduledLesson();
  const queryClient = useQueryClient();

  const { startDate: filterStart, endDate: filterEnd } = getFilterDateRange(dateFilter);

  // Single shared hook for all stats — identical for admin & teacher
  const { stats: allStats, lessons, isLoading } = useStudentLessonStats(studentId, filterStart, filterEnd);

  // Filtered lessons for the list
  const filteredLessons = useMemo(() => {
    return (lessons || []).filter(l => {
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      if (!filterStart || !filterEnd) return matchesStatus;
      return matchesStatus && l.scheduled_date >= filterStart && l.scheduled_date <= filterEnd;
    });
  }, [lessons, statusFilter, filterStart, filterEnd]);

  // Month stats for the filter bar
  const filterStats = useMemo(() => {
    const completed = filteredLessons.filter(l => l.status === 'completed').length;
    const absent = filteredLessons.filter(l => l.status === 'absent').length;
    const hours = filteredLessons
      .filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration_minutes || 45) / 60, 0);
    return { completed, absent, hours };
  }, [filteredLessons]);

  const totalLessons = allStats.completedCount + allStats.absentCount + allStats.scheduledCount;
  const progressPercent = totalLessons > 0 ? ((allStats.completedCount + allStats.absentCount) / totalLessons) * 100 : 0;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleStatusChange = async (lessonId: string, newStatus: string) => {
    try {
      await updateLesson.mutateAsync({ scheduledLessonId: lessonId, status: newStatus });
      toast.success(`Status → ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['student-all-lessons', studentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleSaveNote = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_lessons')
        .update({ notes: noteText })
        .eq('scheduled_lesson_id', lessonId);
      if (error) throw error;
      toast.success('Note saved');
      setEditingNoteId(null);
      queryClient.invalidateQueries({ queryKey: ['student-all-lessons', studentId] });
    } catch (error: any) {
      toast.error('Failed to save note');
    }
  };

  const startEditing = (lesson: any) => {
    setEditingLessonId(lesson.scheduled_lesson_id);
    setEditData({
      date: lesson.scheduled_date,
      time: lesson.scheduled_time,
      duration: lesson.duration_minutes.toString(),
    });
  };

  const handleSaveEdit = async (lessonId: string) => {
    try {
      await updateLesson.mutateAsync({
        scheduledLessonId: lessonId,
        scheduled_date: editData.date,
        scheduled_time: editData.time,
        duration_minutes: parseInt(editData.duration),
      });
      toast.success('Lesson updated');
      setEditingLessonId(null);
      queryClient.invalidateQueries({ queryKey: ['student-all-lessons', studentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteLessonId) return;
    try {
      await deleteLesson.mutateAsync({ scheduledLessonId: deleteLessonId });
      toast.success('Lesson deleted');
      setDeleteLessonId(null);
      queryClient.invalidateQueries({ queryKey: ['student-all-lessons', studentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Weekly Schedule (admin only) */}
      {role === 'admin' && (
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
      )}

      {/* Statistics — 4 stat cards identical for admin & teacher */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{allStats.completedCount}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{allStats.absentCount}</p>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allStats.scheduledCount}</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </div>
        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{allStats.totalHours.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Total Hours</p>
        </div>
      </div>

      {/* Wallet Balance Display */}
      <div className={`rounded-lg p-3 flex items-center justify-between ${allStats.walletBalance <= 0 ? 'bg-red-500/10 border border-red-500/20' : allStats.walletBalance <= 2 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
        <span className="text-sm text-muted-foreground">Wallet Balance</span>
        <span className={`text-lg font-bold flex items-center gap-1 ${allStats.walletBalance <= 0 ? 'text-red-600 dark:text-red-400' : allStats.walletBalance <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {allStats.walletBalance <= 0 && <AlertTriangle className="w-4 h-4" />}
          {allStats.walletBalance <= 0 ? 'Overdue' : allStats.walletBalance <= 2 ? `${allStats.walletBalance} — Low Credit` : `${allStats.walletBalance} lessons remaining`}
        </span>
      </div>

      {/* Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-sm font-bold">{allStats.completedCount + allStats.absentCount} / {totalLessons}</p>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <YearMonthFilter value={dateFilter} onChange={setDateFilter} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 text-xs items-center ml-auto text-muted-foreground">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{filterStats.completed} completed</Badge>
          {filterStats.absent > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{filterStats.absent} absent</Badge>}
          <Badge variant="outline">{filterStats.hours.toFixed(1)}h</Badge>
        </div>
      </div>

      {/* Lessons List */}
      {filteredLessons.length === 0 ? (
        <p className="text-muted-foreground text-center py-6 text-sm">No lessons for this period</p>
      ) : (
        <div className="space-y-2">
          {filteredLessons.map(lesson => {
            const isEditingThis = editingLessonId === lesson.scheduled_lesson_id;
            const isEditingNote = editingNoteId === lesson.scheduled_lesson_id;
            const existingNote = (lesson as any).notes || null;

            return (
              <div
                key={lesson.scheduled_lesson_id}
                className={`rounded-lg border p-3 ${
                  lesson.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' :
                  lesson.status === 'absent' ? 'border-red-500/20 bg-red-500/5' :
                  'border-border/50 bg-card/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {isEditingThis ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input type="date" value={editData.date} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))} className="w-36 h-8" />
                      <Input type="time" value={editData.time} onChange={e => setEditData(p => ({ ...p, time: e.target.value }))} className="w-28 h-8" />
                      <Input type="number" value={editData.duration} onChange={e => setEditData(p => ({ ...p, duration: e.target.value }))} className="w-20 h-8" min="15" max="180" step="15" />
                      <span className="text-xs text-muted-foreground">min</span>
                      <Button size="sm" onClick={() => handleSaveEdit(lesson.scheduled_lesson_id)} disabled={updateLesson.isPending} className="h-8">
                        {updateLesson.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingLessonId(null)} className="h-8">Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{format(new Date(lesson.scheduled_date), 'EEE, MMM d')}</span>
                      <span className="text-muted-foreground">•</span>
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{formatTime(lesson.scheduled_time)}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{lesson.duration_minutes} min</span>
                      {lesson.teachers?.name && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{lesson.teachers.name}</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Select
                      value={lesson.status}
                      onValueChange={(val) => handleStatusChange(lesson.scheduled_lesson_id, val)}
                      disabled={updateLesson.isPending}
                    >
                      <SelectTrigger className="h-7 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled</span>
                        </SelectItem>
                        <SelectItem value="completed">
                          <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Completed</span>
                        </SelectItem>
                        <SelectItem value="absent">
                          <span className="flex items-center gap-1"><X className="w-3 h-3" /> Absent</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {!isEditingThis && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEditing(lesson)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                    {role === 'admin' && lesson.status === 'scheduled' && !isEditingThis && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteLessonId(lesson.scheduled_lesson_id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {isEditingNote ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      placeholder="Add lesson notes..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="min-h-[60px] resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7" onClick={() => handleSaveNote(lesson.scheduled_lesson_id)}>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start gap-1.5">
                    {existingNote ? (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground flex-1 cursor-pointer group" onClick={() => { setEditingNoteId(lesson.scheduled_lesson_id); setNoteText(existingNote); }}>
                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="flex-1">{existingNote}</span>
                        <PenLine className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => { setEditingNoteId(lesson.scheduled_lesson_id); setNoteText(''); }}
                      >
                        <PenLine className="w-3 h-3 mr-1" /> Add note
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
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
              {deleteLesson.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : 'Delete Lesson'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Schedule Dialog (admin only) */}
      {role === 'admin' && (
        <EditScheduleDialog
          studentId={studentId}
          open={isEditScheduleOpen}
          onOpenChange={setIsEditScheduleOpen}
        />
      )}
    </div>
  );
}
