import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useRescheduleLesson, ScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { toast } from 'sonner';

const rescheduleSchema = z.object({
  date: z.date({ required_error: 'Please select a date' }),
});

type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

interface ConflictInfo {
  hasConflict: boolean;
  conflictingLesson?: {
    student_name: string;
    time: string;
  };
}

interface RescheduleDialogProps {
  lesson: ScheduledLesson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RescheduleDialog({ lesson, open, onOpenChange, onSuccess }: RescheduleDialogProps) {
  const [conflict, setConflict] = useState<ConflictInfo>({ hasConflict: false });
  const [checkingConflict, setCheckingConflict] = useState(false);
  const rescheduleLesson = useRescheduleLesson();

  const currentTime = lesson.scheduled_time?.slice(0, 5) || '18:00';

  const form = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      date: lesson.scheduled_date ? parseISO(lesson.scheduled_date) : new Date(),
    },
  });

  const selectedDate = form.watch('date');

  // Check for conflicts when date changes (using existing time)
  const checkConflict = async (date: Date) => {
    if (!lesson.teacher_id) return;
    
    setCheckingConflict(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data: existingLessons, error } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id, scheduled_time, students(name)')
        .eq('teacher_id', lesson.teacher_id)
        .eq('scheduled_date', dateStr)
        .eq('scheduled_time', currentTime + ':00')
        .neq('scheduled_lesson_id', lesson.scheduled_lesson_id)
        .in('status', ['scheduled']);

      if (error) throw error;

      if (existingLessons && existingLessons.length > 0) {
        const conflicting = existingLessons[0];
        setConflict({
          hasConflict: true,
          conflictingLesson: {
            student_name: (conflicting.students as any)?.name || 'Unknown',
            time: conflicting.scheduled_time.slice(0, 5),
          },
        });
      } else {
        setConflict({ hasConflict: false });
      }
    } catch (error) {
      console.error('Error checking conflict:', error);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      form.setValue('date', date);
      checkConflict(date);
    }
  };

  const onSubmit = async (values: RescheduleFormValues) => {
    if (conflict.hasConflict) {
      toast.error('Cannot reschedule: there is a conflict at this time');
      return;
    }

    try {
      await rescheduleLesson.mutateAsync({
        scheduledLessonId: lesson.scheduled_lesson_id,
        newDate: format(values.date, 'yyyy-MM-dd'),
        newTime: currentTime + ':00',
      });

      toast.success('Lesson moved to new date successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reschedule lesson');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Lesson</DialogTitle>
          <DialogDescription>
            Move the lesson for {lesson.students?.name} to a new date.
            {lesson.scheduled_date && (
              <> Current date: {format(parseISO(lesson.scheduled_date), 'MMM d, yyyy')} at {currentTime}.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>New Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-sm text-muted-foreground">
              Time will remain: <strong>{currentTime}</strong>
            </p>

            {/* Conflict Warning */}
            {checkingConflict && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for conflicts...
              </div>
            )}

            {conflict.hasConflict && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Conflict detected!</strong> There is already a lesson with{' '}
                  {conflict.conflictingLesson?.student_name} at{' '}
                  {conflict.conflictingLesson?.time} on this date.
                </AlertDescription>
              </Alert>
            )}

            {!checkingConflict && !conflict.hasConflict && selectedDate && (
              <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-md">
                ✓ Date is available
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={rescheduleLesson.isPending || conflict.hasConflict || checkingConflict}
              >
                {rescheduleLesson.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Moving...
                  </>
                ) : (
                  'Move Lesson'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
