import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Clock, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { TeacherTrialLesson } from '@/hooks/use-teacher-trial-lessons';

interface TrialLessonCardProps {
  lesson: TeacherTrialLesson;
  onLessonMarked?: () => void;
}

export function TrialLessonCard({ lesson, onLessonMarked }: TrialLessonCardProps) {
  const [notes, setNotes] = useState('');
  const [isMarking, setIsMarking] = useState(false);
  const queryClient = useQueryClient();

  const formatTime = (time: string | null) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleMark = async (status: 'completed' | 'cancelled') => {
    setIsMarking(true);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({ 
          status, 
          notes: notes || null 
        })
        .eq('trial_lesson_id', lesson.trial_lesson_id);

      if (error) throw error;

      const label = status === 'completed' ? 'Completed' : 'Absent';
      toast.success(`Trial lesson marked as ${label}!`);
      setNotes('');
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-trial-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-pending-trial-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-all-trial-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-live-stats'] });
      onLessonMarked?.();
    } catch (error: any) {
      toast.error('Failed to mark trial lesson', { description: error.message });
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <Card className="border border-purple-500/30 bg-purple-500/5">
      <CardContent className="p-4">
        <div className="space-y-3">
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

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Add notes about this trial lesson..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-600/30"
              onClick={() => handleMark('completed')}
              disabled={isMarking}
            >
              {isMarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-amber-600/30"
              onClick={() => handleMark('cancelled')}
              disabled={isMarking}
            >
              <X className="w-4 h-4 mr-1" />
              Absent
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
