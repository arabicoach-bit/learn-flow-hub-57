import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Loader2, Gift, CalendarIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  lesson_date: z.date({ required_error: 'Please select a date' }),
  lessons: z.coerce.number().min(1, 'Must add at least 1 lesson').max(50, 'Maximum 50 lessons at a time'),
  lesson_time: z.string().optional(),
  lesson_duration: z.coerce.number().min(15, 'Minimum 15 minutes').max(180, 'Maximum 180 minutes').optional(),
  reason: z.string().min(1, 'Please provide a reason for adding lessons'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddFreeLessonsFormProps {
  studentId: string;
  studentName: string;
  currentWallet: number;
  onSuccess: () => void;
}

export function AddFreeLessonsForm({ studentId, studentName, currentWallet, onSuccess }: AddFreeLessonsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lesson_date: new Date(),
      lessons: 1,
      lesson_time: '',
      lesson_duration: undefined,
      reason: '',
    },
  });

  const lessonsToAdd = form.watch('lessons') || 0;
  const newBalance = currentWallet + lessonsToAdd;

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Calculate new status based on new wallet balance
      let newStatus: 'Active' | 'Temporary Stop' | 'Left';
      if (newBalance >= 3) {
        newStatus = 'Active';
      } else if (newBalance >= -1) {
        newStatus = 'Temporary Stop';
      } else {
        newStatus = 'Left';
      }

      // Update student wallet balance and status
      const { error } = await supabase
        .from('students')
        .update({
          wallet_balance: newBalance,
          status: newStatus,
        })
        .eq('student_id', studentId);

      if (error) throw error;

      // Log in audit
      await supabase.from('audit_logs').insert({
        action: 'add_free_lessons',
        target_user: studentId,
        details: {
          student_name: studentName,
          lessons_added: values.lessons,
          lesson_date: format(values.lesson_date, 'yyyy-MM-dd'),
          lesson_time: values.lesson_time || null,
          lesson_duration: values.lesson_duration || null,
          reason: values.reason,
          old_balance: currentWallet,
          new_balance: newBalance,
        },
      });

      toast.success(`Added ${values.lessons} free lesson(s) to ${studentName}`, {
        description: `New wallet balance: ${newBalance}`,
      });

      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onSuccess();
    } catch (error: any) {
      console.error('Error adding free lessons:', error);
      toast.error('Failed to add free lessons', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Current Balance Info */}
        <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Adding free lessons to</p>
              <p className="font-semibold text-sm sm:text-base">{studentName}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="ml-1 sm:ml-2 font-medium">{currentWallet}</span>
            </div>
            <div>
              <span className="text-muted-foreground">New Balance:</span>
              <span className="ml-1 sm:ml-2 font-medium text-primary">{newBalance}</span>
            </div>
          </div>
        </div>

        {/* Date and Lessons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Lesson Date */}
          <FormField
            control={form.control}
            name="lesson_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Lesson Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
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
                      onSelect={field.onChange}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Number of Lessons */}
          <FormField
            control={form.control}
            name="lessons"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Lessons</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    placeholder="1"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Time and Duration Row (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Lesson Time */}
          <FormField
            control={form.control}
            name="lesson_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Time (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Lesson Duration */}
          <FormField
            control={form.control}
            name="lesson_duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={15}
                    max={180}
                    placeholder="30 minutes"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Reason */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Free Lessons</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Compensation for cancelled class, promotional offer, loyalty bonus..."
                  className="min-h-[60px] sm:min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} className="gap-2 w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                Add {lessonsToAdd} Lesson{lessonsToAdd !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
