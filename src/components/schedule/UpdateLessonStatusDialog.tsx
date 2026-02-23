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
import { useUpdateScheduledLesson, ScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { toast } from 'sonner';

export interface UpdateLessonStatusDialogProps {
  lesson: ScheduledLesson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'absent', label: 'Absent' },
];

export function UpdateLessonStatusDialog({ lesson, open, onOpenChange, onSuccess }: UpdateLessonStatusDialogProps) {
  const [status, setStatus] = useState<string>(lesson.status || 'scheduled');
  const [date, setDate] = useState(lesson.scheduled_date);
  const [time, setTime] = useState(lesson.scheduled_time?.slice(0, 5) || '');
  const [duration, setDuration] = useState(lesson.duration_minutes?.toString() || '45');
  const updateLesson = useUpdateScheduledLesson();

  const handleSubmit = async () => {
    try {
      await updateLesson.mutateAsync({
        scheduledLessonId: lesson.scheduled_lesson_id,
        status,
        scheduled_date: date,
        scheduled_time: time,
        duration_minutes: parseInt(duration),
      });
      toast.success('Lesson updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update lesson');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
          <DialogDescription>
            Edit lesson for {lesson.students?.name || 'student'}.
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
          <Button onClick={handleSubmit} disabled={updateLesson.isPending}>
            {updateLesson.isPending ? (
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
