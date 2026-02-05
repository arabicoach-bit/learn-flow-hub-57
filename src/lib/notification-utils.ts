import { formatDistanceToNow } from 'date-fns';

/**
 * Returns a relative time string like "2 mins ago", "1 hour ago"
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get priority level for notification type (higher = more urgent)
 */
export function getNotificationPriority(type: string): number {
  switch (type) {
    case 'blocked':
      return 4;
    case 'grace_mode':
      return 3;
    case 'unmarked_lesson_reminder':
      return 3;
    case 'low_balance':
      return 2;
    case 'followup_due':
    case 'renewal_due':
      return 1;
    default:
      return 0;
  }
}

/**
 * Get notification styling based on type
 */
export function getNotificationStyles(type: string) {
  switch (type) {
    case 'blocked':
      return {
        borderColor: 'border-destructive/50',
        bgColor: 'bg-destructive/10',
        badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
        icon: '🚫',
        priority: 'critical',
      };
    case 'grace_mode':
      return {
        borderColor: 'border-amber-500/50',
        bgColor: 'bg-amber-500/10',
        badgeClass: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
        icon: '⚠️',
        priority: 'high',
      };
    case 'low_balance':
      return {
        borderColor: 'border-yellow-500/50',
        bgColor: 'bg-yellow-500/10',
        badgeClass: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
        icon: '💰',
        priority: 'medium',
      };
    case 'renewal_due':
      return {
        borderColor: 'border-blue-500/50',
        bgColor: 'bg-blue-500/10',
        badgeClass: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        icon: '📅',
        priority: 'normal',
      };
    case 'followup_due':
      return {
        borderColor: 'border-primary/50',
        bgColor: 'bg-primary/10',
        badgeClass: 'bg-primary/20 text-primary border-primary/30',
        icon: '📞',
        priority: 'normal',
      };
    case 'unmarked_lesson_reminder':
      return {
        borderColor: 'border-orange-500/50',
        bgColor: 'bg-orange-500/10',
        badgeClass: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
        icon: '⏰',
        priority: 'high',
      };
    default:
      return {
        borderColor: 'border-border',
        bgColor: 'bg-muted/30',
        badgeClass: 'bg-muted text-muted-foreground',
        icon: 'ℹ️',
        priority: 'low',
      };
  }
}

/**
 * Format notification type for display
 */
export function formatNotificationType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
