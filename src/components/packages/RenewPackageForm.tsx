import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { usePackageTypes } from '@/hooks/use-package-types';
import { useTeachers } from '@/hooks/use-teachers';
import { useClasses } from '@/hooks/use-classes';
import { usePackages } from '@/hooks/use-packages';
import { useAddPackageWithSchedule, WeeklyScheduleDay } from '@/hooks/use-add-package-with-schedule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, X, Calendar, Clock, DollarSign, RefreshCw, History } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/wallet-utils';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const renewalFormSchema = z.object({
  package_type_id: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  lessons_purchased: z.number().min(1, 'At least 1 lesson required'),
  lesson_duration: z.number().min(15, 'Minimum 15 minutes'),
  start_date: z.string().min(1, 'Start date is required'),
  teacher_id: z.string().min(1, 'Teacher is required'),
  class_id: z.string().optional(),
  use_previous_schedule: z.boolean().default(true),
});

type RenewalFormValues = z.infer<typeof renewalFormSchema>;

interface RenewPackageFormProps {
  studentId: string;
  studentName: string;
  currentWallet: number;
  previousPackageId?: string;
  teacherId?: string;
  classId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface LessonSchedule {
  schedule_id: string;
  day_of_week: number;
  time_slot: string;
}

export function RenewPackageForm({
  studentId,
  studentName,
  currentWallet,
  previousPackageId,
  teacherId,
  classId,
  onSuccess,
  onCancel,
}: RenewPackageFormProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [previousSchedule, setPreviousSchedule] = useState<WeeklyScheduleDay[]>([]);
  const [newDay, setNewDay] = useState<number>(1);
  const [newTime, setNewTime] = useState<string>('18:00');
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const { data: packageTypes } = usePackageTypes();
  const { data: teachers } = useTeachers();
  const { data: classes } = useClasses();
  const { data: packages } = usePackages(studentId);
  const addPackage = useAddPackageWithSchedule();

  // Get the most recent completed or active package
  const lastPackage = useMemo(() => {
    if (!packages || packages.length === 0) return null;
    return packages.find(p => p.package_id === previousPackageId) || packages[0];
  }, [packages, previousPackageId]);

  const form = useForm<RenewalFormValues>({
    resolver: zodResolver(renewalFormSchema),
    defaultValues: {
      amount: 0,
      lessons_purchased: 8,
      lesson_duration: 45,
      start_date: new Date().toISOString().split('T')[0],
      teacher_id: teacherId || '',
      class_id: classId || '',
      use_previous_schedule: true,
    },
  });

  const usePreviousSchedule = form.watch('use_previous_schedule');

  // Load previous schedule when component mounts or package changes
  useEffect(() => {
    if (lastPackage) {
      loadPreviousSchedule(lastPackage.package_id);
      // Pre-fill form with previous package values
      if (lastPackage.package_type_id) {
        form.setValue('package_type_id', lastPackage.package_type_id);
      }
      form.setValue('amount', lastPackage.amount);
      form.setValue('lessons_purchased', lastPackage.lessons_purchased);
      form.setValue('lesson_duration', lastPackage.lesson_duration || 45);
    }
  }, [lastPackage]);

  // Apply previous schedule when checkbox is checked
  useEffect(() => {
    if (usePreviousSchedule && previousSchedule.length > 0) {
      setWeeklySchedule([...previousSchedule]);
    }
  }, [usePreviousSchedule, previousSchedule]);

  const loadPreviousSchedule = async (packageId: string) => {
    setLoadingPrevious(true);
    try {
      const { data, error } = await supabase
        .from('lesson_schedules')
        .select('schedule_id, day_of_week, time_slot')
        .eq('package_id', packageId);

      if (error) throw error;

      const schedule = (data as LessonSchedule[]).map((s) => ({
        day: s.day_of_week,
        time: s.time_slot.slice(0, 5), // Convert to HH:MM format
      }));

      setPreviousSchedule(schedule);
      if (form.getValues('use_previous_schedule')) {
        setWeeklySchedule(schedule);
      }
    } catch (error) {
      console.error('Failed to load previous schedule:', error);
    } finally {
      setLoadingPrevious(false);
    }
  };

  const selectedPackageType = packageTypes?.find(
    (pt) => pt.package_type_id === form.watch('package_type_id')
  );

  useEffect(() => {
    if (selectedPackageType) {
      form.setValue('amount', selectedPackageType.monthly_fee || 0);
      form.setValue('lessons_purchased', selectedPackageType.total_lessons || 8);
      form.setValue('lesson_duration', selectedPackageType.lesson_duration || 45);
    }
  }, [selectedPackageType, form]);

  const addScheduleDay = () => {
    const exists = weeklySchedule.some((s) => s.day === newDay && s.time === newTime);
    if (exists) {
      toast.error('This schedule slot already exists');
      return;
    }
    setWeeklySchedule([...weeklySchedule, { day: newDay, time: newTime }]);
  };

  const removeScheduleDay = (index: number) => {
    setWeeklySchedule(weeklySchedule.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: RenewalFormValues) => {
    if (weeklySchedule.length === 0) {
      toast.error('Please add at least one weekly schedule slot');
      return;
    }

    try {
      const result = await addPackage.mutateAsync({
        student_id: studentId,
        package_type_id: values.package_type_id,
        amount: values.amount,
        lessons_purchased: values.lessons_purchased,
        lesson_duration: values.lesson_duration,
        start_date: values.start_date,
        teacher_id: values.teacher_id,
        class_id: values.class_id,
        weekly_schedule: weeklySchedule,
      });

      const scheduledCount = typeof result.generatedSchedule === 'object' && result.generatedSchedule !== null
        ? (result.generatedSchedule as Record<string, unknown>).lessons_scheduled as number
        : values.lessons_purchased;

      toast.success(`Package renewed successfully! ${scheduledCount} lessons scheduled.`);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to renew package';
      toast.error(message);
    }
  };

  const projectedWallet = currentWallet + (form.watch('lessons_purchased') || 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Student Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <p className="font-medium">Renewing for {studentName}</p>
                </div>
                <p className="text-sm text-muted-foreground">Current Wallet: {currentWallet} lessons</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Projected Wallet</p>
                <p className={`text-xl font-bold ${projectedWallet > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {projectedWallet} lessons
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Package Info */}
        {lastPackage && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" />
                Previous Package
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{lastPackage.package_types?.name || 'Custom'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lessons</p>
                  <p className="font-medium">{lastPackage.lessons_purchased}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(lastPackage.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(lastPackage.payment_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Package Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Package Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="package_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a package type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packageTypes?.map((pt) => (
                        <SelectItem key={pt.package_type_id} value={pt.package_type_id}>
                          {pt.name} - {pt.description} - {formatCurrency(pt.monthly_fee || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-10"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessons_purchased"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Lessons</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lesson_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (mins)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Teacher/Class Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teacher_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers?.map((t) => (
                          <SelectItem key={t.teacher_id} value={t.teacher_id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes?.map((c) => (
                          <SelectItem key={c.class_id} value={c.class_id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Use Previous Schedule Checkbox */}
            {previousSchedule.length > 0 && (
              <FormField
                control={form.control}
                name="use_previous_schedule"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Use previous schedule</FormLabel>
                      <FormDescription>
                        Copy schedule from the previous package ({previousSchedule.length} slots)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Add new schedule slot */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Day</Label>
                <Select value={newDay.toString()} onValueChange={(v) => setNewDay(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="button" onClick={addScheduleDay} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Schedule slots display */}
            {weeklySchedule.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weeklySchedule.map((slot, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-2 py-2 px-3">
                    {DAYS_OF_WEEK.find((d) => d.value === slot.day)?.label} at {slot.time}
                    <button
                      type="button"
                      onClick={() => removeScheduleDay(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {loadingPrevious ? 'Loading previous schedule...' : 'No schedule slots added yet.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={addPackage.isPending || weeklySchedule.length === 0}>
            {addPackage.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Renewing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Renew Package & Generate Schedule
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
