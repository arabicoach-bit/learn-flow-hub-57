import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, XCircle, Save, Loader2, Users, Pencil, GraduationCap, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateAllTrialCaches } from '@/lib/trial-cache-utils';
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
  conversion_status?: string;
  trial_result?: string | null;
  gender?: string | null;
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

const STATUS_STYLES: Record<string, string> = {
  completed: 'border-emerald-500/40 bg-emerald-500/5',
  absent: 'border-destructive/40 bg-destructive/5',
  scheduled: 'border-purple-500/30 bg-purple-500/5',
};

const RESULT_COLORS: Record<string, string> = {
  'Very Positive': 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  'Positive': 'bg-sky-500/20 text-sky-600 border-sky-500/30',
  'Neutral': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  'Negative': 'bg-destructive/20 text-destructive border-destructive/30',
};

const CONVERSION_STYLES: Record<string, string> = {
  Converted: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  Lost: 'bg-destructive/20 text-destructive border-destructive/30',
  Pending: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
};

export function TrialLessonCalendarCard({ lesson, onUpdated, readOnly }: TrialLessonCalendarCardProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(lesson.notes || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isScheduled = lesson.status === 'scheduled';

  const handleMark = async (newStatus: 'completed' | 'absent') => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({ status: newStatus })
        .eq('trial_lesson_id', lesson.trial_lesson_id);
      if (error) throw error;
      toast.success(`Trial lesson marked as ${newStatus}`);
      invalidateAllTrialCaches(queryClient);
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
      invalidateAllTrialCaches(queryClient);
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

  const conversionKey = lesson.conversion_status || 'Pending';
  const conversionBadge = (
    <Badge variant="outline" className={`${CONVERSION_STYLES[conversionKey] || CONVERSION_STYLES.Pending} text-xs gap-1`}>
      {conversionKey}
    </Badge>
  );

  const resultBadge = lesson.trial_result ? (
    <Badge variant="outline" className={`${RESULT_COLORS[lesson.trial_result] || ''} text-xs`}>
      {lesson.trial_result}
    </Badge>
  ) : null;

  return (
    <>
      <div className={`p-4 rounded-xl border transition-all ${STATUS_STYLES[lesson.status] || STATUS_STYLES.scheduled}`}>
        {/* Row 1: Time + Status + Edit */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm">
              {formatTime12(lesson.lesson_time)} – {getEndTime(lesson.lesson_time, lesson.duration_minutes)}
            </span>
            <Badge variant="outline" className="text-xs font-medium">
              {lesson.duration_minutes} min
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs gap-1">
              <Users className="w-3 h-3" /> Trial
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge}
            {!readOnly && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Student identity */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <span className="font-semibold">{lesson.student_name}</span>
              {lesson.age != null && (
                <span className="text-xs text-muted-foreground ml-1.5">({lesson.age}y)</span>
              )}
            </div>
          </div>
          {lesson.student_phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" /> {lesson.student_phone}
            </div>
          )}
        </div>

        {/* Row 3: Student details chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {lesson.interested_program && (
            <Badge variant="secondary" className="text-xs gap-1 font-normal">
              <GraduationCap className="w-3 h-3" /> {lesson.interested_program}
            </Badge>
          )}
          {lesson.student_level && (
            <Badge variant="secondary" className="text-xs font-normal">Level: {lesson.student_level}</Badge>
          )}
          {lesson.year_group && (
            <Badge variant="secondary" className="text-xs font-normal">Year: {lesson.year_group}</Badge>
          )}
          {lesson.school && (
            <Badge variant="secondary" className="text-xs font-normal">{lesson.school}</Badge>
          )}
          {lesson.parent_guardian_name && (
            <Badge variant="secondary" className="text-xs font-normal">Parent: {lesson.parent_guardian_name}</Badge>
          )}
        </div>

        {/* Row 4: Conversion + Result badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {conversionBadge}
          {resultBadge}
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

        {/* Actions */}
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
            !readOnly && lesson.status !== 'scheduled' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => handleMark('scheduled' as any)}
                disabled={isUpdating}
              >
                Reset to Scheduled
              </Button>
            )
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
