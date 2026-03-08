import { useState } from 'react';
import { ExternalLink, Copy, Check, MessageCircle, Calendar, BookOpen, Clock, RefreshCw, FileText, StickyNote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Notification,
  useMarkNotificationRead,
  useParentPhone,
} from '@/hooks/use-notifications';
import {
  formatRelativeTime,
  getNotificationStyles,
  parseNotificationDetails,
  formatWhatsAppMessage,
} from '@/lib/notification-utils';
import { usePackageNotificationDetails, formatSchedule } from '@/hooks/use-package-notification-details';
import { useLessonNotificationDetails } from '@/hooks/use-lesson-notification-details';
import { format } from 'date-fns';

interface NotificationCardProps {
  notification: Notification;
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const { data: parentPhone } = useParentPhone(notification.related_id, notification.type);
  const { data: packageDetails } = usePackageNotificationDetails(
    notification.related_id,
    notification.type,
    notification.created_at
  );
  const { data: lessonDetails } = useLessonNotificationDetails(
    notification.related_id,
    notification.type,
    notification.created_at
  );
  const [copied, setCopied] = useState(false);

  const styles = getNotificationStyles(notification.type);
  const details = parseNotificationDetails(notification.message);

  const handleNavigate = () => {
    if (!notification.is_read) markRead.mutate(notification.notification_id);
    if (!notification.related_id) return;

    if (notification.type === 'trial_completed') {
      navigate('/admin/trial-students');
    } else {
      navigate(`/students/${notification.related_id}`);
    }
  };

  const getNavigateLabel = () => {
    switch (notification.type) {
      case 'trial_completed': return 'Go to Trial';
      case 'new_package': return 'Go to Student';
      case 'lesson_completed': return 'Go to Student';
      default: return 'View';
    }
  };

  const whatsappMessage = formatWhatsAppMessage(
    notification.type,
    notification.student_name || 'Student',
    notification.message
  );

  const handleWhatsApp = () => {
    if (!notification.is_read) markRead.mutate(notification.notification_id);
    const phone = parentPhone?.replace(/[^0-9+]/g, '') || '';
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    toast.success('Message copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isPackage = notification.type === 'new_package' && packageDetails;
  const isLesson = notification.type === 'lesson_completed';

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        notification.is_read
          ? 'bg-muted/20 border-border/30 opacity-70'
          : `${styles.bgColor} ${styles.borderColor}`
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{styles.icon}</span>
          <Badge variant="outline" className={styles.badgeClass}>
            {styles.label}
          </Badge>
          {isPackage && packageDetails.is_renewal && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1">
              <RefreshCw className="w-3 h-3" />
              Renewal
            </Badge>
          )}
          {!notification.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(notification.created_at)}
        </span>
      </div>

      {/* Student name */}
      {notification.student_name && (
        <h4 className="font-semibold text-base mb-2">{notification.student_name}</h4>
      )}

      {/* LESSON COMPLETED - Rich details */}
      {isLesson ? (
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {/* Teacher - from parsed message or fetched details */}
            {(lessonDetails?.teacher_name || details.teacher) && (
              <>
                <span className="text-muted-foreground">👨‍🏫 Teacher</span>
                <span className="font-medium">{lessonDetails?.teacher_name || details.teacher}</span>
              </>
            )}
            {/* Date */}
            {lessonDetails?.scheduled_date && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date
                </span>
                <span className="font-medium">{format(new Date(lessonDetails.scheduled_date), 'dd MMM yyyy')}</span>
              </>
            )}
            {/* Time */}
            {lessonDetails?.scheduled_time && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Time
                </span>
                <span className="font-medium">{formatTime12h(lessonDetails.scheduled_time)}</span>
              </>
            )}
            {/* Duration */}
            {lessonDetails?.duration_minutes && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Duration
                </span>
                <span className="font-medium">{lessonDetails.duration_minutes} min</span>
              </>
            )}
            {/* Wallet */}
            {notification.wallet_balance !== null && notification.wallet_balance !== undefined && (
              <>
                <span className="text-muted-foreground">💰 Wallet</span>
                <span className={`font-medium ${
                  notification.wallet_balance === 0
                    ? 'text-destructive font-bold'
                    : notification.wallet_balance <= 2
                    ? 'text-amber-500 font-bold'
                    : ''
                }`}>
                  {notification.wallet_balance} lessons
                </span>
              </>
            )}
          </div>

          {/* Notes */}
          {(lessonDetails?.notes || (details.notes && details.notes !== '-')) && (
            <div className="text-sm p-2 rounded-lg bg-background/50 border border-border/30">
              <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> Notes
              </span>
              <p className="font-medium mt-0.5">{lessonDetails?.notes || details.notes}</p>
            </div>
          )}
        </div>
      ) : isPackage ? (
        /* PACKAGE - Rich details */
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {packageDetails.package_type_name && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Package Type
                </span>
                <span className="font-medium">{packageDetails.package_type_name}</span>
              </>
            )}
            <span className="text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Lessons
            </span>
            <span className="font-medium">{packageDetails.lessons_purchased} lessons</span>
            
            {packageDetails.lesson_duration && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Duration
                </span>
                <span className="font-medium">{packageDetails.lesson_duration} min</span>
              </>
            )}
            {packageDetails.lessons_per_week && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Per Week
                </span>
                <span className="font-medium">{packageDetails.lessons_per_week}x/week</span>
              </>
            )}
            {packageDetails.start_date && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Start Date
                </span>
                <span className="font-medium">{format(new Date(packageDetails.start_date), 'dd MMM yyyy')}</span>
              </>
            )}
            {details.teacher && (
              <>
                <span className="text-muted-foreground">👨‍🏫 Teacher</span>
                <span className="font-medium">{details.teacher}</span>
              </>
            )}
            {notification.wallet_balance !== null && notification.wallet_balance !== undefined && (
              <>
                <span className="text-muted-foreground">💰 Wallet</span>
                <span className="font-medium">{notification.wallet_balance} lessons</span>
              </>
            )}
          </div>

          {packageDetails.schedule.length > 0 && (
            <div className="text-sm mt-2 p-2 rounded-lg bg-background/50 border border-border/30">
              <span className="text-muted-foreground text-xs font-medium">📅 Schedule</span>
              <p className="font-medium mt-0.5">{formatSchedule(packageDetails.schedule)}</p>
            </div>
          )}

          {packageDetails.description && (
            <div className="text-sm mt-1 p-2 rounded-lg bg-background/50 border border-border/30">
              <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                <FileText className="w-3 h-3" /> Description
              </span>
              <p className="font-medium mt-0.5">{packageDetails.description}</p>
            </div>
          )}
        </div>
      ) : (
        /* DEFAULT - Trial & other notifications */
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
          {details.teacher && (
            <>
              <span className="text-muted-foreground">Teacher</span>
              <span className="font-medium">{details.teacher}</span>
            </>
          )}
          {details.date && (
            <>
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{details.date}</span>
            </>
          )}
          {details.notes && details.notes !== '-' && (
            <>
              <span className="text-muted-foreground">Notes</span>
              <span className="font-medium">{details.notes}</span>
            </>
          )}
          {details.remaining && (
            <>
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-medium">{details.remaining}</span>
            </>
          )}
          {notification.wallet_balance !== null && notification.wallet_balance !== undefined && (
            <>
              <span className="text-muted-foreground">Wallet</span>
              <span className="font-medium">{notification.wallet_balance} lessons</span>
            </>
          )}
          {details.lessons && (
            <>
              <span className="text-muted-foreground">Package</span>
              <span className="font-medium">{details.lessons}</span>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
        {notification.related_id && (
          <Button size="sm" variant="outline" onClick={handleNavigate} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            {getNavigateLabel()}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleWhatsApp} className="gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10">
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="gap-1.5">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
