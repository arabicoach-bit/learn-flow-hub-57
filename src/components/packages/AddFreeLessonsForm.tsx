import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, Gift } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const formSchema = z.object({
  lessons: z.coerce.number().min(1, 'Must add at least 1 lesson').max(50, 'Maximum 50 lessons at a time'),
  lesson_time: z.string().min(1, 'Please select a lesson time'),
  lesson_duration: z.coerce.number().min(15, 'Minimum 15 minutes').max(180, 'Maximum 180 minutes'),
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
      lessons: 1,
      lesson_time: '',
      lesson_duration: 30,
      reason: '',
    },
  });

  const lessonsToAdd = form.watch('lessons') || 0;
  const newBalance = currentWallet + lessonsToAdd;

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Calculate new status based on new wallet balance
      let newStatus: 'Active' | 'Grace' | 'Blocked';
      if (newBalance >= 3) {
        newStatus = 'Active';
      } else if (newBalance >= -1) {
        newStatus = 'Grace';
      } else {
        newStatus = 'Blocked';
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
          lesson_time: values.lesson_time,
          lesson_duration: values.lesson_duration,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Current Balance Info */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Adding free lessons to</p>
              <p className="font-semibold">{studentName}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="ml-2 font-medium">{currentWallet} lessons</span>
            </div>
            <div>
              <span className="text-muted-foreground">New Balance:</span>
              <span className="ml-2 font-medium text-primary">{newBalance} lessons</span>
            </div>
          </div>
        </div>

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

        {/* Lesson Time */}
        <FormField
          control={form.control}
          name="lesson_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lesson Time</FormLabel>
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
              <FormLabel>Lesson Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={15}
                  max={180}
                  placeholder="30"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
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
