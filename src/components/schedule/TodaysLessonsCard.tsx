import { useState, useEffect } from 'react';
import { useTodaysScheduledLessons, useMarkScheduledLesson, ScheduledLesson } from '@/hooks/use-scheduled-lessons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RescheduleDialog } from './RescheduleDialog';
import { getWalletColor, getWalletDisplayLabel } from '@/lib/wallet-utils';
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, Ban, RefreshCw, CalendarClock } from 'lucide-react';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { toast } from 'sonner';

interface TodaysLessonsCardProps {
  teacherId: string;
}

export function TodaysLessonsCard({ teacherId }: TodaysLessonsCardProps) {
  const [now, setNow] = useState(new Date());
  const [rescheduleLesson, setRescheduleLesson] = useState<ScheduledLesson | null>(null);
  const { data: lessons, isLoading, refetch } = useTodaysScheduledLessons(teacherId);
  const markLesson = useMarkScheduledLesson();

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => refetch(), 300000);
    return () => clearInterval(refreshInterval);
  }, [refetch]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTimeUntilLesson = (date: string, time: string) => {
    const lessonDateTime = parseISO(`${date}T${time}`);
    const diffMinutes = differenceInMinutes(lessonDateTime, now);
    
    if (diffMinutes < 0) {
      const absDiff = Math.abs(diffMinutes);
      if (absDiff < 60) return `Started ${absDiff} min ago`;
      return `Started ${Math.floor(absDiff / 60)}h ${absDiff % 60}m ago`;
    }
    if (diffMinutes === 0) return 'Starting now!';
    if (diffMinutes < 60) return `Starts in ${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `Starts in ${hours}h ${mins}m`;
  };

  const isLessonActive = (date: string, time: string, duration: number) => {
    const lessonStart = parseISO(`${date}T${time}`);
    const lessonEnd = addMinutes(lessonStart, duration);
    return now >= lessonStart && now <= lessonEnd;
  };

  const handleMarkLesson = async (lessonId: string, status: 'completed' | 'absent', studentStatus?: string) => {
    if (status === 'completed' && studentStatus === 'Left') {
      toast.error('Cannot mark as Taken - student has left');
      return;
    }

    try {
      const result = await markLesson.mutateAsync({
        scheduledLessonId: lessonId,
        status,
      });
      const newWallet = typeof result === 'object' && result !== null 
        ? (result as Record<string, unknown>).new_wallet 
        : undefined;
      toast.success(`Lesson marked as ${status}${newWallet !== undefined ? `. New wallet: ${newWallet}` : ''}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark lesson');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today's Lessons
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {!lessons?.length ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No lessons scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => {
                const isActive = isLessonActive(lesson.scheduled_date, lesson.scheduled_time, lesson.duration_minutes);
                const isBlocked = lesson.students?.status === 'Left';
                const timeUntil = getTimeUntilLesson(lesson.scheduled_date, lesson.scheduled_time);

                return (
                  <div
                    key={lesson.scheduled_lesson_id}
                    className={`p-4 rounded-lg border transition-all ${
                      isActive 
                        ? 'border-primary bg-primary/5 shadow-lg' 
                        : isBlocked
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'border-border/50 bg-card/50'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Time & Student Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[80px]">
                            <p className={`text-lg font-bold ${isActive ? 'text-primary' : ''}`}>
                              {formatTime(lesson.scheduled_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">{lesson.duration_minutes} min</p>
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${isBlocked ? 'text-muted-foreground' : ''}`}>
                              {lesson.students?.name || 'Unknown Student'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline">{lesson.classes?.name || 'No class'}</Badge>
                              <span className={`text-sm font-medium ${getWalletColor(lesson.students?.wallet_balance || 0)}`}>
                                Wallet: {getWalletDisplayLabel(lesson.students?.wallet_balance || 0)}
                              </span>
                              {isBlocked && (
                                <Badge variant="destructive" className="gap-1">
                                  <Ban className="w-3 h-3" />
                                  LEFT
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Time countdown */}
                        <div className={`mt-2 text-sm ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {timeUntil}
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
                                className="bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                onClick={() => handleMarkLesson(lesson.scheduled_lesson_id, 'completed', lesson.students?.status)}
                                disabled={markLesson.isPending || isBlocked}
                              >
                                {markLesson.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                Taken
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {isBlocked && (
                            <TooltipContent className="bg-destructive">
                              Student has left.
                            </TooltipContent>
                          )}
                        </Tooltip>

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          onClick={() => handleMarkLesson(lesson.scheduled_lesson_id, 'absent', lesson.students?.status)}
                          disabled={markLesson.isPending}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Absent
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRescheduleLesson(lesson)}
                          disabled={markLesson.isPending}
                        >
                          <CalendarClock className="w-4 h-4 mr-1" />
                          Reschedule
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-neutral-500/10 border-neutral-500/30 hover:bg-neutral-500/20"
                          onClick={() => handleMarkLesson(lesson.scheduled_lesson_id, 'absent', lesson.students?.status)}
                          disabled={markLesson.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Absent
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      {rescheduleLesson && (
        <RescheduleDialog
          lesson={rescheduleLesson}
          open={!!rescheduleLesson}
          onOpenChange={(open) => !open && setRescheduleLesson(null)}
          onSuccess={() => setRescheduleLesson(null)}
        />
      )}
    </TooltipProvider>
  );
}
