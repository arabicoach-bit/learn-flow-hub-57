import { Skeleton } from '@/components/ui/skeleton';
import type { StudentBatchStats } from '@/hooks/use-students-batch-stats';

interface LessonsCellProps {
  stats?: StudentBatchStats;
  isLoading?: boolean;
}

export function LessonsCell({ stats, isLoading }: LessonsCellProps) {
  if (isLoading) return <Skeleton className="h-4 w-12" />;
  if (!stats || stats.lessonsTotal === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="text-sm font-medium">
      {stats.lessonsUsed}/{stats.lessonsTotal}
    </span>
  );
}
