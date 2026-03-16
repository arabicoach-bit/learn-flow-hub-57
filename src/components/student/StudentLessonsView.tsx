import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { WeeklyScheduleCard } from '@/components/schedule/WeeklyScheduleCard';

import { LessonCard } from '@/components/schedule/LessonCard';
import type { LessonCardData } from '@/components/schedule/LessonCard';
import { useDeleteScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { useStudentLessonStats } from '@/hooks/use-student-lesson-stats';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
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
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  
  const deleteLesson = useDeleteScheduledLesson();
  const queryClient = useQueryClient();

  const { startDate: filterStart, endDate: filterEnd } = getFilterDateRange(dateFilter);

  const { stats: allStats, lessons, isLoading } = useStudentLessonStats(studentId, filterStart, filterEnd);

  const filteredLessons = useMemo(() => {
    return (lessons || []).filter(l => {
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      if (!filterStart || !filterEnd) return matchesStatus;
      return matchesStatus && l.scheduled_date >= filterStart && l.scheduled_date <= filterEnd;
    });
  }, [lessons, statusFilter, filterStart, filterEnd]);

  const filterStats = useMemo(() => {
    const completed = filteredLessons.filter(l => l.status === 'completed').length;
    const absent = filteredLessons.filter(l => l.status === 'absent').length;
    const hours = filteredLessons
      .filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration_minutes || 45) / 60, 0);
    return { completed, absent, hours };
  }, [filteredLessons]);

  const usedLessons = allStats.activePackageLessonsUsed;
  const totalLessons = allStats.activePackageLessonsTotal;
  const progressPercent = totalLessons > 0 ? (usedLessons / totalLessons) * 100 : 0;

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

  const invalidateStudentData = () => {
    queryClient.invalidateQueries({ queryKey: ['student-all-lessons', studentId] });
    queryClient.invalidateQueries({ queryKey: ['student-active-packages', studentId] });
    queryClient.invalidateQueries({ queryKey: ['student-wallet', studentId] });
    queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['packages'] });
    queryClient.invalidateQueries({ queryKey: ['packages-batch-stats'] });
    queryClient.invalidateQueries({ queryKey: ['students-batch-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-teacher-today-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
  };

  const toLessonCardData = (lesson: any): LessonCardData => ({
    scheduled_lesson_id: lesson.scheduled_lesson_id,
    scheduled_date: lesson.scheduled_date,
    scheduled_time: lesson.scheduled_time,
    duration_minutes: lesson.duration_minutes,
    status: lesson.status,
    notes: lesson.notes,
    package_id: lesson.package_id,
    student_id: lesson.student_id || studentId,
    teacher_id: lesson.teacher_id,
    lesson_log_id: lesson.lesson_log_id,
    students: {
      name: studentName,
      phone: undefined,
      status: undefined,
      wallet_balance: walletBalance,
    },
  });

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

      {/* Statistics */}
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

      {/* Wallet & Lessons Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg p-3 flex flex-col items-center justify-center ${allStats.walletBalance <= 0 ? 'bg-red-500/10 border border-red-500/20' : allStats.walletBalance <= 2 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
          <span className="text-xs text-muted-foreground">Wallet</span>
          <span className={`text-2xl font-bold flex items-center gap-1 ${allStats.walletBalance <= 0 ? 'text-red-600 dark:text-red-400' : allStats.walletBalance <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {allStats.walletBalance <= 0 && <AlertTriangle className="w-4 h-4" />}
            {allStats.walletBalance}
          </span>
        </div>
        <div className="rounded-lg p-3 flex flex-col items-center justify-center bg-blue-500/10 border border-blue-500/20">
          <span className="text-xs text-muted-foreground">Lessons</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {usedLessons}/{totalLessons}
          </span>
        </div>
      </div>

      {/* Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Package Progress</p>
            <p className="text-sm font-bold">{usedLessons} / {totalLessons}</p>
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

      {/* Lessons List — using LessonCard for consistency with calendar views */}
      {filteredLessons.length === 0 ? (
        <p className="text-muted-foreground text-center py-6 text-sm">No lessons for this period</p>
      ) : (
        <div className="space-y-3">
          {filteredLessons.map(lesson => (
            <LessonCard
              key={lesson.scheduled_lesson_id}
              lesson={toLessonCardData(lesson)}
              showDate
              onUpdated={invalidateStudentData}
              onDelete={role === 'admin' ? (id) => setDeleteLessonId(id) : undefined}
            />
          ))}
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
