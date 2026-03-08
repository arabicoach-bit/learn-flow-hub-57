import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, XCircle, Save, Loader2, Users, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UpdateTrialLessonDialog } from './UpdateTrialLessonDialog';

export interface TrialLessonCalendarData {
  trial_lesson_id: string;
  trial_student_id: string;
  student_name: string;
  student_phone?: string;
  lesson_date: string;
  lesson_time: string | null;
  duration_minutes: number;
  status: string;
  notes: string | null;
  teacher_payment_amount: number | null;
  age?: number | null;
  school?: string | null;
  year_group?: string | null;
  interested_program?: string | null;
  student_level?: string | null;
  parent_guardian_name?: string | null;
}

interface TrialLessonCalendarCardProps {
  lesson: TrialLessonCalendarData;
  onUpdated?: () => void;
  readOnly?: boolean;
}

function formatTime12(time: string | null) {
  if (!time) return '-';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getEndTime(time: string | null, duration: number) {
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
      return 'border-purple-500/30 bg-purple-500/5';
  }
}

export function TrialLessonCalendarCard({ lesson, onUpdated, readOnly }: TrialLessonCalendarCardProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(lesson.notes || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isScheduled = lesson.status === 'scheduled';

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-trial-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['admin-teacher-trial-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-todays-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-pending-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-all-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['admin-teacher-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-live-stats'] });
  };

  const handleMark = async (newStatus: 'completed' | 'absent') => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({ status: newStatus })
        .eq('trial_lesson_id', lesson.trial_lesson_id);
      if (error) throw error;
      toast.success(`Trial lesson marked as ${newStatus}`);
      invalidateAll();
      onUpdated?.();
    } catch (error: any) {
      toast.error('Failed to update', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({ notes: notes || null })
        .eq('trial_lesson_id', lesson.trial_lesson_id);
      if (error) throw error;
      toast.success('Note saved');
      invalidateAll();
    } catch (error: any) {
      toast.error('Failed to save note', { description: error.message });
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
    <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1">
      <Clock className="w-3 h-3" /> Scheduled
    </Badge>
  );

  return (
    <>
      <div className={`p-4 rounded-xl border transition-all ${getStatusStyle(lesson.status)}`}>
        {/* Header: Time range + duration + Edit */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">
              {formatTime12(lesson.lesson_time)} - {getEndTime(lesson.lesson_time, lesson.duration_minutes)}
            </span>
            <Badge variant="outline" className="text-xs font-medium">
              {lesson.duration_minutes} min
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs gap-1">
              <Users className="w-3 h-3" /> Trial
            </Badge>
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>

        {/* Student info */}
        <div className="flex items-center gap-3 mb-2">
          <span className="font-medium text-base">{lesson.student_name}</span>
          {lesson.student_phone && (
            <span className="text-sm text-muted-foreground">{lesson.student_phone}</span>
          )}
        </div>

        {/* Extra student details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
          {lesson.age && <span>Age: {lesson.age}</span>}
          {lesson.student_level && <span>Level: {lesson.student_level}</span>}
          {lesson.interested_program && <span>Program: {lesson.interested_program}</span>}
          {lesson.year_group && <span>Year: {lesson.year_group}</span>}
          {lesson.school && <span>School: {lesson.school}</span>}
          {lesson.parent_guardian_name && <span>Parent: {lesson.parent_guardian_name}</span>}
        </div>

        {/* Notes */}
        {!readOnly && (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground mb-1.5">Notes</p>
            <div className="flex gap-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a comment about this trial lesson..."
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
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Completed
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 gap-1.5"
                onClick={() => handleMark('absent')}
                disabled={isUpdating}
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

      {editOpen && (
        <UpdateTrialLessonDialog
          lesson={lesson}
          open={editOpen}
          onOpenChange={(open) => !open && setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            onUpdated?.();
          }}
        />
      )}
    </>
  );
}
