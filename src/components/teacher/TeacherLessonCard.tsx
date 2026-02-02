import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getWalletColor } from '@/lib/wallet-utils';
import { Check, X, Ban, Clock, Loader2, RefreshCw, Edit2, Save, Calendar as CalendarIcon } from 'lucide-react';
import { useMarkScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RescheduleDialog } from '@/components/schedule/RescheduleDialog';
import { useQueryClient } from '@tanstack/react-query';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedTime, setEditedTime] = useState(lesson.scheduled_time);
  const [editedDuration, setEditedDuration] = useState(lesson.duration_minutes.toString());
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const markLesson = useMarkScheduledLesson();
  const queryClient = useQueryClient();
  const isBlocked = lesson.student_status === 'Blocked';
  
  // Check if the lesson date is today or in the past (can mark)
  const lessonDate = date || lesson.scheduled_date || new Date().toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const isFutureLesson = lessonDate > today;

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

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('scheduled_lessons')
        .update({
          scheduled_time: editedTime,
          duration_minutes: parseInt(editedDuration),
        })
        .eq('scheduled_lesson_id', lesson.scheduled_lesson_id);

      if (error) throw error;

      toast.success('Lesson updated successfully!');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
    } catch (error: any) {
      toast.error('Failed to update lesson', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkLesson = async (status: 'Taken' | 'Absent' | 'Cancelled') => {
    if (status === 'Taken' && isBlocked) {
      toast.error('Cannot mark as Completed', {
        description: `${lesson.student_name} is blocked. Payment required.`,
      });
      return;
    }

    try {
      await markLesson.mutateAsync({
        scheduledLessonId: lesson.scheduled_lesson_id,
        status,
        notes: notes || undefined,
      });
      
      const statusLabel = status === 'Taken' ? 'Completed' : status;
      toast.success(`Lesson marked as ${statusLabel}!`);
      setNotes('');
      onLessonMarked?.();
    } catch (error: any) {
      toast.error('Failed to mark lesson', {
        description: error.message,
      });
    }
  };

  const displayTime = isEditing ? editedTime : lesson.scheduled_time;
  const displayDuration = isEditing ? parseInt(editedDuration) : lesson.duration_minutes;

  return (
    <TooltipProvider>
      <Card className={`border ${isBlocked ? 'border-destructive/50 bg-destructive/5' : 'border-border/50 bg-card/50'}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Time and Student Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isEditing ? (
                    <>
                      <Input
                        type="time"
                        value={editedTime}
                        onChange={(e) => setEditedTime(e.target.value)}
                        className="w-32 h-8"
                      />
                      <Input
                        type="number"
                        value={editedDuration}
                        onChange={(e) => setEditedDuration(e.target.value)}
                        className="w-20 h-8"
                        min="15"
                        max="180"
                        step="15"
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatTime(displayTime)} - {getEndTime(displayTime, displayDuration)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {displayDuration} min
                      </Badge>
                    </>
                  )}
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

              {/* Edit Button */}
              <div className="flex gap-2">
                {isEditing ? (
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Save
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Notes Input */}
            <div className="space-y-2">
              <Label htmlFor={`notes-${lesson.scheduled_lesson_id}`} className="text-sm text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                id={`notes-${lesson.scheduled_lesson_id}`}
                placeholder="Add a comment about this lesson..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-600/30"
                      onClick={() => handleMarkLesson('Taken')}
                      disabled={markLesson.isPending || isBlocked || isFutureLesson}
                    >
                      {markLesson.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      Completed
                    </Button>
                  </span>
                </TooltipTrigger>
                {(isBlocked || isFutureLesson) && (
                  <TooltipContent className="bg-destructive text-destructive-foreground">
                    <p>{isFutureLesson ? 'Cannot mark future lessons' : 'Student is blocked. Payment required.'}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-600/30"
                      onClick={() => handleMarkLesson('Cancelled')}
                      disabled={markLesson.isPending || isFutureLesson}
                    >
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      Teacher's Schedule
                    </Button>
                  </span>
                </TooltipTrigger>
                {isFutureLesson && (
                  <TooltipContent>
                    <p>Cannot mark future lessons</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border-purple-600/30"
                      onClick={() => handleMarkLesson('Cancelled')}
                      disabled={markLesson.isPending || isFutureLesson}
                    >
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      Student's Schedule
                    </Button>
                  </span>
                </TooltipTrigger>
                {isFutureLesson && (
                  <TooltipContent>
                    <p>Cannot mark future lessons</p>
                  </TooltipContent>
                )}
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-amber-600/30"
                      onClick={() => handleMarkLesson('Absent')}
                      disabled={markLesson.isPending || isFutureLesson}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Absent
                    </Button>
                  </span>
                </TooltipTrigger>
                {isFutureLesson && (
                  <TooltipContent>
                    <p>Cannot mark future lessons</p>
                  </TooltipContent>
                )}
              </Tooltip>

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