import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getWalletColor, getWalletDisplayLabel } from '@/lib/wallet-utils';
import { Clock, CheckCircle, XCircle, Pencil, Save, Loader2, Trash2 } from 'lucide-react';
import { useMarkScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { UpdateLessonStatusDialog } from './UpdateLessonStatusDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ScheduledLesson } from '@/hooks/use-scheduled-lessons';

export interface LessonCardData {
  scheduled_lesson_id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  notes?: string | null;
  package_id?: string | null;
  student_id?: string | null;
  teacher_id?: string | null;
  lesson_log_id?: string | null;
  created_at?: string;
  students?: {
    name: string;
    phone?: string;
    status?: string;
    wallet_balance?: number;
  } | null;
}

interface LessonCardProps {
  lesson: LessonCardData;
  onUpdated?: () => void;
  showDate?: boolean;
  /** Hide action buttons (for read-only calendar views) */
  readOnly?: boolean;
}

function formatTime12(time: string) {
  if (!time) return '-';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getEndTime(time: string, duration: number) {
  if (!time) return '-';
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMin = totalMinutes % 60;
  return formatTime12(`${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`);
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/40 bg-emerald-500/5';
    case 'absent':
      return 'border-destructive/40 bg-destructive/5';
    default:
      return 'border-border/60 bg-card/50';
  }
}

export function LessonCard({ lesson, onUpdated, showDate, readOnly }: LessonCardProps) {
  const markLesson = useMarkScheduledLesson();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(lesson.notes || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editLesson, setEditLesson] = useState(false);

  const studentName = lesson.students?.name || 'Unknown Student';
  const walletBalance = lesson.students?.wallet_balance ?? 0;
  const isBlocked = lesson.students?.status === 'Left';
  const isScheduled = lesson.status === 'scheduled';

  const handleMark = async (status: 'completed' | 'absent') => {
    if (status === 'completed' && isBlocked) {
      toast.error('Cannot mark as completed — student has left');
      return;
    }
    try {
      await markLesson.mutateAsync({
        scheduledLessonId: lesson.scheduled_lesson_id,
        status,
        notes: notes || undefined,
      });
      toast.success(`Lesson marked as ${status}`);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark lesson');
    }
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from('scheduled_lessons')
        .update({ notes })
        .eq('scheduled_lesson_id', lesson.scheduled_lesson_id);
      if (error) throw error;
      toast.success('Note saved');
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-today-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      onUpdated?.();
    } catch (err: any) {
      toast.error('Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  const statusBadge = lesson.status === 'completed' ? (
    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1">
      <CheckCircle className="w-3 h-3" /> Completed
    </Badge>
  ) : lesson.status === 'absent' ? (
    <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
      <XCircle className="w-3 h-3" /> Absent
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
      <Clock className="w-3 h-3" /> Scheduled
    </Badge>
  );

  return (
    <>
      <div className={`p-4 rounded-xl border transition-all ${getStatusStyle(lesson.status)}`}>
        {/* Header: Time range + duration + edit */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">
              {formatTime12(lesson.scheduled_time)} - {getEndTime(lesson.scheduled_time, lesson.duration_minutes)}
            </span>
            <Badge variant="outline" className="text-xs font-medium">
              {lesson.duration_minutes} min
            </Badge>
            {showDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(lesson.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditLesson(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>

        {/* Student info */}
        <div className="flex items-center gap-3 mb-3">
          <span className="font-medium text-base">{studentName}</span>
          <Badge className={`${getWalletColor(walletBalance)} text-xs gap-1`}>
            💰 {getWalletDisplayLabel(walletBalance)}
          </Badge>
          {isBlocked && (
            <Badge variant="destructive" className="text-xs">LEFT</Badge>
          )}
        </div>

        {/* Notes */}
        {!readOnly && (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground mb-1.5">Notes</p>
            <div className="flex gap-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a comment about this lesson..."
                className="min-h-[60px] text-sm resize-none"
              />
              <Button
                size="sm"
                variant="outline"
                className="self-end gap-1"
                disabled={isSavingNote}
                onClick={handleSaveNote}
              >
                {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Actions / Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {isScheduled && !readOnly ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 gap-1.5"
                onClick={() => handleMark('completed')}
                disabled={markLesson.isPending || isBlocked}
              >
                {markLesson.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Completed
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 gap-1.5"
                onClick={() => handleMark('absent')}
                disabled={markLesson.isPending}
              >
                <XCircle className="w-3.5 h-3.5" />
                Absent
              </Button>
            </>
          ) : (
            statusBadge
          )}
        </div>
      </div>

      {editLesson && (
        <UpdateLessonStatusDialog
          lesson={lesson as ScheduledLesson}
          open={editLesson}
          onOpenChange={(open) => !open && setEditLesson(false)}
          onSuccess={() => {
            setEditLesson(false);
            onUpdated?.();
          }}
        />
      )}
    </>
  );
}
