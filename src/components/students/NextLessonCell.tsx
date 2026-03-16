import { format } from 'date-fns';
import type { StudentBatchStats } from '@/hooks/use-students-batch-stats';

interface NextLessonCellProps {
  stats?: StudentBatchStats;
}

export function NextLessonCell({ stats }: NextLessonCellProps) {
  if (!stats?.nextLessonDate || !stats?.nextLessonTime) {
    return <span className="text-muted-foreground">—</span>;
  }

  const dateTime = new Date(`${stats.nextLessonDate}T${stats.nextLessonTime}`);

  return (
    <span className="text-sm">
      {format(dateTime, 'dd MMM yy HH:mm')}
    </span>
  );
}
