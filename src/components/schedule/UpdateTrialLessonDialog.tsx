import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TrialLessonCalendarData } from './TrialLessonCalendarCard';

interface UpdateTrialLessonDialogProps {
  lesson: TrialLessonCalendarData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'absent', label: 'Absent' },
];

export function UpdateTrialLessonDialog({ lesson, open, onOpenChange, onSuccess }: UpdateTrialLessonDialogProps) {
  const [status, setStatus] = useState(lesson.status || 'scheduled');
  const [date, setDate] = useState(lesson.lesson_date);
  const [time, setTime] = useState(lesson.lesson_time?.slice(0, 5) || '');
  const [duration, setDuration] = useState(lesson.duration_minutes?.toString() || '30');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-trial-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['admin-teacher-trial-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-todays-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-pending-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-all-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['admin-teacher-trial-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-live-stats'] });
    queryClient.invalidateQueries({ queryKey: ['trial-students'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-payroll-unified'] });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({
          status,
          lesson_date: date,
          lesson_time: time || null,
          duration_minutes: parseInt(duration),
        })
        .eq('trial_lesson_id', lesson.trial_lesson_id);

      if (error) throw error;

      toast.success('Trial lesson updated successfully');
      invalidateAll();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update trial lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Trial Lesson</DialogTitle>
          <DialogDescription>
            Edit trial lesson for {lesson.student_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
