import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';

interface LessonsBadgeProps {
  used: number;
  total: number;
  /** 'table' = compact with inline progress, 'chip' = card-style chip with progress bar */
  variant?: 'table' | 'chip';
}

/**
 * Unified Lessons display component used across all views.
 * Shows used/total with an optional progress bar.
 */
export function LessonsBadge({ used, total, variant = 'table' }: LessonsBadgeProps) {
  if (total === 0) return <span className="text-muted-foreground">—</span>;

  const progress = (used / total) * 100;

  if (variant === 'chip') {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 min-w-[100px]">
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-medium">{used}/{total} lessons</p>
          <Progress value={progress} className="h-1 mt-0.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <span className="text-sm font-medium whitespace-nowrap">{used}/{total}</span>
      <Progress value={progress} className="h-1.5 flex-1" />
    </div>
  );
}
