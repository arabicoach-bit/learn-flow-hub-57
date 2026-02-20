import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RescheduleDialog } from '@/components/schedule/RescheduleDialog';
import { useUpdateScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { toast } from 'sonner';
import { 
  Calendar, Clock, Check, X, RefreshCw, Edit2, Save, Loader2, 
  MessageSquare, AlertTriangle, PenLine
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface StudentLessonHistoryProps {
  studentId: string;
  studentName: string;
  walletBalance: number;
  teacherId?: string;
}

export function StudentLessonHistory({ studentId, studentName, walletBalance, teacherId }: StudentLessonHistoryProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ date: '', time: '', duration: '' });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [rescheduleLesson, setRescheduleLesson] = useState<any>(null);
  const updateLesson = useUpdateScheduledLesson();
  const queryClient = useQueryClient();

  // Fetch ALL lessons for this student (scheduled + completed + cancelled)
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['student-all-lessons', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id, scheduled_date, scheduled_time, duration_minutes, status, teacher_id, package_id, notes')
        .eq('student_id', studentId)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lesson notes
  const { data: lessonNotes } = useQuery({
    queryKey: ['student-lesson-notes', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons_log')
        .select('lesson_id, lesson_date, status, notes')
        .eq('student_id', studentId)
        .order('lesson_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const filteredLessons = useMemo(() => {
    return lessons?.filter(l => {
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesMonth = l.scheduled_date >= monthStartStr && l.scheduled_date <= monthEndStr;
      return matchesStatus && matchesMonth;
    }) || [];
  }, [lessons, statusFilter, monthStartStr, monthEndStr]);

  // Stats from ALL lessons (not filtered by month)
  const allStats = useMemo(() => {
    const all = lessons || [];
    const completed = all.filter(l => l.status === 'completed').length;
    const absent = all.filter(l => l.status === 'absent').length;
    const scheduled = all.filter(l => l.status === 'scheduled').length;
    const totalHours = all
      .filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration_minutes || 45) / 60, 0);
    return { completed, absent, scheduled, totalHours };
  }, [lessons]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const completed = filteredLessons.filter(l => l.status === 'completed').length;
    const absent = filteredLessons.filter(l => l.status === 'absent').length;
    const hours = filteredLessons
      .filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration_minutes || 45) / 60, 0);
    return { completed, absent, hours };
  }, [filteredLessons]);

  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') });
    }
    return months;
  }, []);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getNotesForLesson = (lesson: any) => {
    // Prefer notes from scheduled_lessons directly
    if (lesson.notes) return lesson.notes;
    return lessonNotes?.find(n => n.lesson_date === lesson.scheduled_date)?.notes || null;
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
      toast.error('Failed to save note', { description: error.message });
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const handleStatusChange = async (lessonId: string, newStatus: string) => {
    try {
      await updateLesson.mutateAsync({
        scheduledLessonId: lessonId,
        status: newStatus,
      });
      toast.success(`Lesson status changed to ${newStatus === 'completed' ? 'Completed' : newStatus === 'absent' ? 'Absent' : 'Scheduled'}`);
      queryClient.invalidateQueries({ queryKey: ['student-all-lessons', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-lesson-notes', studentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
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

  if (isLoading) {
    return <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{allStats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
          <p className="text-lg font-bold text-red-400">{allStats.absent}</p>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{allStats.totalHours.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Total Hours</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${walletBalance <= 2 ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
          <p className={`text-lg font-bold flex items-center justify-center gap-1 ${walletBalance <= 2 ? 'text-red-400' : 'text-amber-400'}`}>
            {walletBalance <= 2 && <AlertTriangle className="w-4 h-4" />}
            {walletBalance}
          </p>
          <p className="text-xs text-muted-foreground">Wallet (Scheduled)</p>
        </div>
      </div>

      {/* Month filter + status filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
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
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{monthStats.completed} completed</Badge>
          {monthStats.absent > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{monthStats.absent} absent</Badge>}
          <Badge variant="outline">{monthStats.hours.toFixed(1)}h</Badge>
        </div>
      </div>

      {/* Lessons list */}
      {filteredLessons.length === 0 ? (
        <p className="text-muted-foreground text-center py-6 text-sm">No lessons for this period</p>
      ) : (
        <div className="space-y-2">
          {filteredLessons.map(lesson => {
            const isEditing = editingLessonId === lesson.scheduled_lesson_id;
            const isEditingNote = editingNoteId === lesson.scheduled_lesson_id;
            const existingNote = getNotesForLesson(lesson);
            const canMark = lesson.status === 'scheduled' && lesson.scheduled_date <= today;

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
                  {isEditing ? (
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
                    {!isEditing && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEditing(lesson)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notes Section */}
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

                {/* Reschedule button for scheduled lessons */}
                {lesson.status === 'scheduled' && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-600/30"
                      onClick={() => setRescheduleLesson({
                        scheduled_lesson_id: lesson.scheduled_lesson_id,
                        student_id: studentId,
                        scheduled_date: lesson.scheduled_date,
                        scheduled_time: lesson.scheduled_time,
                        teacher_id: teacherId || lesson.teacher_id,
                        students: { name: studentName },
                      })}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reschedule
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rescheduleLesson && (
        <RescheduleDialog
          open={!!rescheduleLesson}
          onOpenChange={(open) => !open && setRescheduleLesson(null)}
          lesson={rescheduleLesson}
          onSuccess={() => {
            setRescheduleLesson(null);
            queryClient.invalidateQueries({ queryKey: ['student-all-lessons', studentId] });
          }}
        />
      )}
    </div>
  );
}
