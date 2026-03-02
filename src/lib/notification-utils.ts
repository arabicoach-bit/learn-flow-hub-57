import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function getNotificationPriority(type: string): number {
  switch (type) {
    case 'blocked': return 4;
    case 'grace_mode': return 3;
    case 'unmarked_lesson_reminder': return 3;
    case 'trial_completed': return 3;
    case 'low_balance': return 2;
    case 'followup_due':
    case 'renewal_due': return 1;
    case 'lesson_completed': return 1;
    case 'new_package': return 1;
    case 'daily_summary': return 0;
    default: return 0;
  }
}

export function getNotificationStyles(type: string) {
  switch (type) {
    case 'blocked':
      return {
        borderColor: 'border-destructive/50',
        bgColor: 'bg-destructive/10',
        badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
        icon: '🚫',
        label: 'Student Left',
        priority: 'critical',
      };
    case 'grace_mode':
      return {
        borderColor: 'border-amber-500/50',
        bgColor: 'bg-amber-500/10',
        badgeClass: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
        icon: '⚠️',
        label: 'No Lessons',
        priority: 'high',
      };
    case 'low_balance':
      return {
        borderColor: 'border-yellow-500/50',
        bgColor: 'bg-yellow-500/10',
        badgeClass: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
        icon: '💰',
        label: 'Low Credit',
        priority: 'medium',
      };
    case 'renewal_due':
      return {
        borderColor: 'border-blue-500/50',
        bgColor: 'bg-blue-500/10',
        badgeClass: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        icon: '📅',
        label: 'Renewal Due',
        priority: 'normal',
      };
    case 'followup_due':
      return {
        borderColor: 'border-primary/50',
        bgColor: 'bg-primary/10',
        badgeClass: 'bg-primary/20 text-primary border-primary/30',
        icon: '📞',
        label: 'Follow Up',
        priority: 'normal',
      };
    case 'unmarked_lesson_reminder':
      return {
        borderColor: 'border-orange-500/50',
        bgColor: 'bg-orange-500/10',
        badgeClass: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
        icon: '⏰',
        label: 'Unmarked Lesson',
        priority: 'high',
      };
    case 'lesson_completed':
      return {
        borderColor: 'border-green-500/50',
        bgColor: 'bg-green-500/10',
        badgeClass: 'bg-green-500/20 text-green-600 border-green-500/30',
        icon: '✅',
        label: 'Lesson Done',
        priority: 'info',
      };
    case 'trial_completed':
      return {
        borderColor: 'border-blue-500/50',
        bgColor: 'bg-blue-500/10',
        badgeClass: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
        icon: '🎓',
        label: 'Trial Done',
        priority: 'high',
      };
    case 'new_package':
      return {
        borderColor: 'border-emerald-500/50',
        bgColor: 'bg-emerald-500/10',
        badgeClass: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
        icon: '📦',
        label: 'New Package',
        priority: 'info',
      };
    case 'daily_summary':
      return {
        borderColor: 'border-purple-500/50',
        bgColor: 'bg-purple-500/10',
        badgeClass: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
        icon: '📊',
        label: 'Daily Summary',
        priority: 'low',
      };
    default:
      return {
        borderColor: 'border-border',
        bgColor: 'bg-muted/30',
        badgeClass: 'bg-muted text-muted-foreground',
        icon: 'ℹ️',
        label: 'Info',
        priority: 'low',
      };
  }
}

export function formatNotificationType(type: string): string {
  const styles = getNotificationStyles(type);
  return styles.label || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
