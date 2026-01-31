import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { getWalletColor } from '@/lib/wallet-utils';
import { Check, X, Ban, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useMarkScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { toast } from 'sonner';
import { RescheduleDialog } from '@/components/schedule/RescheduleDialog';

interface TeacherLessonCardProps {
  lesson: {
    scheduled_lesson_id: string;
    student_id: string;
    student_name: string;
    wallet_balance: number;
    student_status: string;
    scheduled_time: string;
    duration_minutes: number;
    status: string;
    program_name: string | null;
    student_level: string | null;
    teacher_id?: string;
    scheduled_date?: string;
  };
  onLessonMarked?: () => void;
  showDate?: boolean;
  date?: string;
}

export function TeacherLessonCard({ lesson, onLessonMarked, showDate, date }: TeacherLessonCardProps) {
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const markLesson = useMarkScheduledLesson();
  const isBlocked = lesson.student_status === 'Blocked';

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return formatTime(`${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`);
  };

  const getWalletBadgeColor = (balance: number) => {
    if (balance >= 5) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (balance >= 3) return 'bg-lime-500/20 text-lime-400 border-lime-500/30';
    if (balance >= 1) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const handleMarkLesson = async (status: 'Taken' | 'Absent' | 'Cancelled') => {
    if (status === 'Taken' && isBlocked) {
      toast.error('Cannot mark as Taken', {
        description: `${lesson.student_name} is blocked. Payment required.`,
      });
      return;
    }

    try {
      await markLesson.mutateAsync({
        scheduledLessonId: lesson.scheduled_lesson_id,
        status,
      });
      toast.success(`Lesson marked as ${status}!`);
      onLessonMarked?.();
    } catch (error: any) {
      toast.error('Failed to mark lesson', {
        description: error.message,
      });
    }
  };

  return (
    <TooltipProvider>
      <Card className={`border ${isBlocked ? 'border-destructive/50 bg-destructive/5' : 'border-border/50 bg-card/50'}`}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Time and Student Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {formatTime(lesson.scheduled_time)} - {getEndTime(lesson.scheduled_time, lesson.duration_minutes)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {lesson.duration_minutes} min
                </Badge>
                {showDate && date && (
                  <Badge variant="secondary" className="text-xs">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-semibold text-lg ${isBlocked ? 'text-muted-foreground' : ''}`}>
                  {lesson.student_name}
                </span>
                <Badge variant="outline" className={getWalletBadgeColor(lesson.wallet_balance)}>
                  💰 {lesson.wallet_balance}
                </Badge>
                {lesson.program_name && (
                  <Badge variant="secondary" className="text-xs">
                    {lesson.program_name}
                  </Badge>
                )}
                {isBlocked && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    BLOCKED
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-600/30"
                      onClick={() => handleMarkLesson('Taken')}
                      disabled={markLesson.isPending || isBlocked}
                    >
                      {markLesson.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      Taken
                    </Button>
                  </span>
                </TooltipTrigger>
                {isBlocked && (
                  <TooltipContent className="bg-destructive text-destructive-foreground">
                    <p>Student is blocked. Payment required.</p>
                  </TooltipContent>
                )}
              </Tooltip>
              
              <Button
                size="sm"
                variant="outline"
                className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-amber-600/30"
                onClick={() => handleMarkLesson('Absent')}
                disabled={markLesson.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                Absent
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="bg-neutral-600/20 hover:bg-neutral-600/30 text-neutral-400 border-neutral-600/30"
                onClick={() => handleMarkLesson('Cancelled')}
                disabled={markLesson.isPending}
              >
                <Ban className="w-4 h-4 mr-1" />
                Cancel
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRescheduleOpen(true)}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isRescheduleOpen && (
        <RescheduleDialog
          open={isRescheduleOpen}
          onOpenChange={setIsRescheduleOpen}
          lesson={{
            scheduled_lesson_id: lesson.scheduled_lesson_id,
            student_id: lesson.student_id,
            scheduled_date: date || new Date().toISOString().split('T')[0],
            scheduled_time: lesson.scheduled_time,
            teacher_id: (lesson as any).teacher_id,
            students: { name: lesson.student_name },
          } as any}
        />
      )}
    </TooltipProvider>
  );
}
