import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, CalendarDays } from 'lucide-react';
import { useLessonScheduleTemplate } from '@/hooks/use-lesson-schedule-template';

interface WeeklyScheduleCardProps {
  studentId: string;
}

export function WeeklyScheduleCard({ studentId }: WeeklyScheduleCardProps) {
  const { data: scheduleData, isLoading } = useLessonScheduleTemplate(studentId);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
        <CardContent className="pt-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!scheduleData || scheduleData.schedules.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-4">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No weekly schedule configured yet.</p>
            <p className="text-sm mt-1">Add a package with schedule to set up lesson days.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { lessonsPerWeek, lessonDuration, schedules } = scheduleData;

  return (
    <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          Weekly Schedule
          <Badge variant="secondary" className="ml-auto">
            {lessonsPerWeek} {lessonsPerWeek === 1 ? 'lesson' : 'lessons'}/week
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {schedules.map((schedule, index) => (
            <div
              key={schedule.schedule_id}
              className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{schedule.dayName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{schedule.formattedTime}</span>
                  <span className="text-xs">•</span>
                  <span>{lessonDuration} mins</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="mt-4 pt-3 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            <span>
              <strong className="text-foreground">{lessonsPerWeek}</strong> days per week
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>
              <strong className="text-foreground">{lessonDuration}</strong> minutes per lesson
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
