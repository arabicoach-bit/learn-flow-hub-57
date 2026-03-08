import { formatDistanceToNow, format } from 'date-fns';

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

function formatTime12h(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// Enriched data interfaces for share messages
export interface LessonShareData {
  teacher_name?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
  wallet_balance?: number | null;
}

export interface PackageShareData {
  package_type_name?: string | null;
  lessons_purchased?: number;
  lesson_duration?: number | null;
  lessons_per_week?: number | null;
  start_date?: string | null;
  is_renewal?: boolean | null;
  description?: string | null;
  schedule?: { day_of_week: number; time_slot: string }[];
  wallet_balance?: number | null;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Build rich WhatsApp message for lesson_completed using fetched data
export function formatLessonShareMessage(studentName: string, data: LessonShareData): string {
  let msg = `Hello! This is an update about ${studentName}'s lesson:\n\n`;
  msg += `✅ Lesson Completed\n`;
  if (data.teacher_name) msg += `👨‍🏫 Teacher: ${data.teacher_name}\n`;
  if (data.scheduled_date) msg += `📅 Date: ${format(new Date(data.scheduled_date), 'dd MMM yyyy')}\n`;
  if (data.scheduled_time) msg += `🕐 Time: ${formatTime12h(data.scheduled_time)}\n`;
  if (data.duration_minutes) msg += `⏱️ Duration: ${data.duration_minutes} min\n`;
  if (data.notes && data.notes !== '-') msg += `📝 Notes: ${data.notes}\n`;
  if (data.wallet_balance !== null && data.wallet_balance !== undefined) {
    msg += `📚 Remaining: ${data.wallet_balance} lessons\n`;
  }
  msg += `\nThank you!`;
  return msg;
}

// Build rich WhatsApp message for new_package using fetched data
export function formatPackageShareMessage(studentName: string, data: PackageShareData, teacherName?: string | null): string {
  let msg = `Hello! This is an update about ${studentName}'s ${data.is_renewal ? 'package renewal' : 'new package'}:\n\n`;
  msg += `📦 ${data.is_renewal ? 'Package Renewed' : 'New Package Activated'}\n`;
  if (data.package_type_name) msg += `📋 Type: ${data.package_type_name}\n`;
  if (data.lessons_purchased) msg += `📚 Lessons: ${data.lessons_purchased}\n`;
  if (data.lesson_duration) msg += `⏱️ Duration: ${data.lesson_duration} min per lesson\n`;
  if (data.lessons_per_week) msg += `📅 Schedule: ${data.lessons_per_week}x per week\n`;
  if (data.start_date) msg += `🗓️ Start: ${format(new Date(data.start_date), 'dd MMM yyyy')}\n`;
  if (teacherName) msg += `👨‍🏫 Teacher: ${teacherName}\n`;
  if (data.schedule && data.schedule.length > 0) {
    const schedStr = data.schedule
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map(s => `${DAY_NAMES_SHORT[s.day_of_week]} ${formatTime12h(s.time_slot)}`)
      .join(', ');
    msg += `📅 Days: ${schedStr}\n`;
  }
  if (data.wallet_balance !== null && data.wallet_balance !== undefined) {
    msg += `💰 Wallet: ${data.wallet_balance} lessons\n`;
  }
  msg += `\nThank you!`;
  return msg;
}

// Legacy fallback for when enriched data is not available
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
