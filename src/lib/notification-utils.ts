import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function getNotificationStyles(type: string) {
  switch (type) {
    case 'lesson_completed':
      return {
        borderColor: 'border-green-500/50',
        bgColor: 'bg-green-500/10',
        badgeClass: 'bg-green-500/20 text-green-600 border-green-500/30',
        icon: '✅',
        label: 'Lesson Completed',
      };
    case 'trial_completed':
      return {
        borderColor: 'border-blue-500/50',
        bgColor: 'bg-blue-500/10',
        badgeClass: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
        icon: '🎓',
        label: 'Trial Completed',
      };
    case 'new_package':
      return {
        borderColor: 'border-emerald-500/50',
        bgColor: 'bg-emerald-500/10',
        badgeClass: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
        icon: '📦',
        label: 'New Package',
      };
    default:
      return {
        borderColor: 'border-border',
        bgColor: 'bg-muted/30',
        badgeClass: 'bg-muted text-muted-foreground',
        icon: 'ℹ️',
        label: 'Info',
      };
  }
}

export function formatNotificationType(type: string): string {
  const styles = getNotificationStyles(type);
  return styles.label || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Parse structured data from notification message
export function parseNotificationDetails(message: string): Record<string, string> {
  const details: Record<string, string> = {};
  const parts = message.split(' | ');
  
  for (const part of parts) {
    const cleaned = part.replace(/^[^\w]*/, '').trim();
    if (cleaned.startsWith('Teacher:')) details.teacher = cleaned.replace('Teacher:', '').trim();
    else if (cleaned.startsWith('Notes:')) details.notes = cleaned.replace('Notes:', '').trim();
    else if (cleaned.startsWith('Date:')) details.date = cleaned.replace('Date:', '').trim();
    else if (cleaned.startsWith('Remaining:')) details.remaining = cleaned.replace('Remaining:', '').trim();
    else if (cleaned.startsWith('Action:')) details.action = cleaned.replace('Action:', '').trim();
    else if (cleaned.includes('lessons')) details.lessons = cleaned;
    else if (cleaned.includes('AED')) details.amount = cleaned;
    else if (cleaned.includes('Wallet:')) details.wallet = cleaned.replace('Wallet:', '').trim();
  }
  
  // Extract the main subject (first part before |)
  if (parts.length > 0) {
    details.subject = parts[0].replace(/^[^\w]*/, '').trim();
  }
  
  return details;
}

// Format a WhatsApp message for sharing with parents
export function formatWhatsAppMessage(type: string, studentName: string, message: string): string {
  const details = parseNotificationDetails(message);
  
  switch (type) {
    case 'lesson_completed':
      return `Hello! This is an update about ${studentName}'s lesson:\n\n` +
        `✅ Lesson Completed\n` +
        (details.teacher ? `👨‍🏫 Teacher: ${details.teacher}\n` : '') +
        (details.notes && details.notes !== '-' ? `📝 Notes: ${details.notes}\n` : '') +
        (details.remaining ? `📚 ${details.remaining}\n` : '') +
        `\nThank you!`;
    
    case 'trial_completed':
      return `Hello! This is an update about ${studentName}'s trial lesson:\n\n` +
        `🎓 Trial Lesson Completed\n` +
        (details.date ? `📅 Date: ${details.date}\n` : '') +
        (details.teacher ? `👨‍🏫 Teacher: ${details.teacher}\n` : '') +
        (details.notes && details.notes !== '-' ? `📝 Notes: ${details.notes}\n` : '') +
        `\nThank you!`;
    
    case 'new_package':
      return `Hello! This is an update about ${studentName}'s new package:\n\n` +
        `📦 New Package Activated\n` +
        (details.lessons ? `📚 ${details.lessons}\n` : '') +
        (details.wallet ? `💰 Wallet: ${details.wallet} lessons\n` : '') +
        `\nThank you!`;
    
    default:
      return message;
  }
}
