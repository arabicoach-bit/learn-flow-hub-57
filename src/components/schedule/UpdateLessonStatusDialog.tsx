import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateScheduledLesson, ScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { toast } from 'sonner';

interface UpdateLessonStatusDialogProps {
  lesson: ScheduledLesson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Absent' },
];

export function UpdateLessonStatusDialog({ lesson, open, onOpenChange }: UpdateLessonStatusDialogProps) {
  const [status, setStatus] = useState<string>(lesson.status || 'scheduled');
  const updateLesson = useUpdateScheduledLesson();

  const handleSubmit = async () => {
    try {
      await updateLesson.mutateAsync({
        scheduledLessonId: lesson.scheduled_lesson_id,
        status,
      });
      toast.success('Lesson status updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update lesson status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Lesson Status</DialogTitle>
          <DialogDescription>
            Update the status for {lesson.students?.name}'s lesson on{' '}
            {lesson.scheduled_date} at {lesson.scheduled_time?.slice(0, 5)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateLesson.isPending}>
            {updateLesson.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
