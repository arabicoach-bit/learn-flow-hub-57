import { useState, useEffect } from 'react';
import { useTodaysScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LessonCard } from './LessonCard';
import { Clock, RefreshCw } from 'lucide-react';

interface TodaysLessonsCardProps {
  teacherId: string;
}

export function TodaysLessonsCard({ teacherId }: TodaysLessonsCardProps) {
  const { data: lessons, isLoading, refetch } = useTodaysScheduledLessons(teacherId);

  useEffect(() => {
    const interval = setInterval(() => refetch(), 300000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Today's Lessons</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Today's Lessons ({lessons?.length || 0})
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
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.scheduled_lesson_id}
                lesson={lesson}
                onUpdated={() => refetch()}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
