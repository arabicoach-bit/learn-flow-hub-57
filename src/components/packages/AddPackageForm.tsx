import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { usePackageTypes } from '@/hooks/use-package-types';
import { useTeachers } from '@/hooks/use-teachers';
import { useAddPackageWithSchedule, WeeklyScheduleDay } from '@/hooks/use-add-package-with-schedule';
import { toast } from 'sonner';
import { Loader2, Plus, X, Calendar, Clock, DollarSign, BookOpen } from 'lucide-react';
import { formatCurrency } from '@/lib/wallet-utils';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const packageFormSchema = z.object({
  package_type_id: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  lessons_purchased: z.number().min(1, 'At least 1 lesson required'),
  lesson_duration: z.number().min(15, 'Minimum 15 minutes'),
  start_date: z.string().min(1, 'Start date is required'),
  teacher_id: z.string().min(1, 'Teacher is required'),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

interface AddPackageFormProps {
  studentId: string;
  studentName: string;
  currentWallet: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddPackageForm({ studentId, studentName, currentWallet, onSuccess, onCancel }: AddPackageFormProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [newDay, setNewDay] = useState<number>(1);
  const [newTime, setNewTime] = useState<string>('18:00');
  const [useCustomPackage, setUseCustomPackage] = useState(false);

  const { data: packageTypes } = usePackageTypes();
  const { data: teachers } = useTeachers();
  const addPackage = useAddPackageWithSchedule();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      amount: 0,
      lessons_purchased: 8,
      lesson_duration: 45,
      start_date: new Date().toISOString().split('T')[0],
      teacher_id: '',
    },
  });

  const selectedPackageType = packageTypes?.find(
    (pt) => pt.package_type_id === form.watch('package_type_id')
  );

  useEffect(() => {
    if (selectedPackageType && !useCustomPackage) {
      form.setValue('amount', selectedPackageType.monthly_fee || 0);
      form.setValue('lessons_purchased', selectedPackageType.total_lessons || 8);
      form.setValue('lesson_duration', selectedPackageType.lesson_duration || 45);
    }
  }, [selectedPackageType, form, useCustomPackage]);

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

  const onSubmit = async (values: PackageFormValues) => {
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
        weekly_schedule: weeklySchedule,
      });

      const scheduledCount = typeof result.generatedSchedule === 'object' && result.generatedSchedule !== null
        ? (result.generatedSchedule as Record<string, unknown>).lessons_scheduled as number
        : values.lessons_purchased;

      toast.success(`Package added successfully! ${scheduledCount} lessons scheduled.`);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add package';
      toast.error(message);
    }
  };

  const projectedWallet = currentWallet + (form.watch('lessons_purchased') || 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{studentName}</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Package Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!useCustomPackage ? (
              <>
                <FormField
                  control={form.control}
                  name="package_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Package</FormLabel>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setUseCustomPackage(true)}>
                  Use Custom Values
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setUseCustomPackage(false)}>
                Use Package Type
              </Button>
            )}

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
                        <Input type="number" step="0.01" className="pl-10" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} disabled={!useCustomPackage && !!selectedPackageType} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="lessons_purchased" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Lessons</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} disabled={!useCustomPackage && !!selectedPackageType} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lesson_duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (mins)</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} disabled={!useCustomPackage && !!selectedPackageType} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Assignment</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="teacher_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Teacher *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger></FormControl>
                  <SelectContent>{teachers?.map((t) => <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5" />Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Day</Label>
                <Select value={newDay.toString()} onValueChange={(v) => setNewDay(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS_OF_WEEK.map((day) => <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Button type="button" onClick={addScheduleDay} size="icon"><Plus className="w-4 h-4" /></Button>
            </div>

            {weeklySchedule.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weeklySchedule.map((slot, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-2 py-2 px-3">
                    {DAYS_OF_WEEK.find((d) => d.value === slot.day)?.label} at {slot.time}
                    <button type="button" onClick={() => removeScheduleDay(index)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No schedule slots added yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" disabled={addPackage.isPending || weeklySchedule.length === 0}>
            {addPackage.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add Package & Generate Schedule'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
