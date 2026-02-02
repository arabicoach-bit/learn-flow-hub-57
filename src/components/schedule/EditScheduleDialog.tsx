import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, CalendarDays } from 'lucide-react';
import { useLessonScheduleTemplate } from '@/hooks/use-lesson-schedule-template';

interface EditScheduleDialogProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ScheduleEntry {
  schedule_id?: string;
  day_of_week: number;
  time_slot: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function EditScheduleDialog({ studentId, open, onOpenChange, onSuccess }: EditScheduleDialogProps) {
  const queryClient = useQueryClient();
  const { data: scheduleData, isLoading: scheduleLoading } = useLessonScheduleTemplate(studentId);
  
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [packageId, setPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (scheduleData?.schedules) {
      setSchedules(scheduleData.schedules.map(s => ({
        schedule_id: s.schedule_id,
        day_of_week: s.day_of_week,
        time_slot: s.time_slot.slice(0, 5), // Remove seconds
      })));
    }
  }, [scheduleData]);

  // Get active package ID
  useEffect(() => {
    const fetchPackageId = async () => {
      const { data } = await supabase
        .from('packages')
        .select('package_id')
        .eq('student_id', studentId)
        .eq('status', 'Active')
        .maybeSingle();
      
      if (data) {
        setPackageId(data.package_id);
      }
    };
    
    if (open && studentId) {
      fetchPackageId();
    }
  }, [open, studentId]);

  const updateSchedule = useMutation({
    mutationFn: async () => {
      if (!packageId) throw new Error('No active package found');

      // Delete existing schedules for this package
      await supabase
        .from('lesson_schedules')
        .delete()
        .eq('package_id', packageId);

      // Insert new schedules
      if (schedules.length > 0) {
        const { error } = await supabase
          .from('lesson_schedules')
          .insert(
            schedules.map(s => ({
              package_id: packageId,
              day_of_week: s.day_of_week,
              time_slot: s.time_slot + ':00',
              timezone: 'Asia/Dubai',
            }))
          );
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-schedule-template', studentId] });
      toast.success('Schedule updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update schedule');
    },
  });

  const addScheduleEntry = () => {
    setSchedules([...schedules, { day_of_week: 1, time_slot: '09:00' }]);
  };

  const removeScheduleEntry = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateScheduleEntry = (index: number, field: keyof ScheduleEntry, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchedule.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Edit Weekly Schedule
          </DialogTitle>
        </DialogHeader>
        
        {scheduleLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !packageId ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No active package found.</p>
            <p className="text-sm mt-2">Add a package first to create a weekly schedule.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {schedules.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No schedule entries. Add lesson days below.
                </p>
              ) : (
                schedules.map((schedule, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Day</Label>
                      <Select
                        value={schedule.day_of_week.toString()}
                        onValueChange={(v) => updateScheduleEntry(index, 'day_of_week', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_NAMES.map((day, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Time</Label>
                      <Input
                        type="time"
                        value={schedule.time_slot}
                        onChange={(e) => updateScheduleEntry(index, 'time_slot', e.target.value)}
                      />
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive mt-5"
                      onClick={() => removeScheduleEntry(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Button type="button" variant="outline" onClick={addScheduleEntry} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Lesson Day
            </Button>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSchedule.isPending}>
                {updateSchedule.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Schedule
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
