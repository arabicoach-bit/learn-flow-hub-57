import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Clock, Loader2, Users, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { TeacherTrialLesson } from '@/hooks/use-teacher-trial-lessons';

interface TrialLessonCardProps {
  lesson: TeacherTrialLesson;
  onLessonMarked?: () => void;
}

export function TrialLessonCard({ lesson, onLessonMarked }: TrialLessonCardProps) {
  const [notes, setNotes] = useState(lesson.notes || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const queryClient = useQueryClient();

  const formatTime = (time: string | null) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-todays-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-pending-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-all-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-live-stats'] });
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({ status: newStatus })
        .eq('trial_lesson_id', lesson.trial_lesson_id);

      if (error) throw error;

      const label = newStatus === 'completed' ? 'Completed' : newStatus === 'absent' ? 'Absent' : 'Scheduled';
      toast.success(`Trial lesson marked as ${label}`);
      invalidateAll();
      onLessonMarked?.();
    } catch (error: any) {
      toast.error('Failed to update trial lesson', { description: error.message });
    } finally {
      setIsUpdatingStatus(false);
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

  const currentStatus = lesson.status === 'completed' ? 'completed' : lesson.status === 'absent' ? 'absent' : 'scheduled';

  return (
    <Card className="border border-purple-500/30 bg-purple-500/5">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Time and Student Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {formatTime(lesson.lesson_time)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {lesson.duration_minutes} min
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Trial
                </Badge>
              </div>
              <span className="font-semibold text-lg">{lesson.student_name}</span>
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Notes</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment about this trial lesson..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px] resize-none flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="self-end"
                disabled={isSavingNote || !notes.trim()}
                onClick={handleSaveNote}
              >
                {isSavingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                Save
              </Button>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select
              value={currentStatus}
              onValueChange={handleStatusChange}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="w-[140px] h-8 text-sm">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
