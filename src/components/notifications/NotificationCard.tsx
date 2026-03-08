import { useState, useMemo } from 'react';
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
  formatLessonShareMessage,
  formatPackageShareMessage,
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

// ===== Sub-components =====

function DetailRow({ icon, label, value, className }: { icon?: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <>
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span className={`font-medium ${className || ''}`}>{value}</span>
    </>
  );
}

function WalletDetail({ balance }: { balance: number | null | undefined }) {
  if (balance === null || balance === undefined) return null;
  const colorClass = balance === 0 ? 'text-destructive font-bold' : balance <= 2 ? 'text-amber-500 font-bold' : '';
  return <DetailRow label="💰 Wallet" value={`${balance} lessons`} className={colorClass} />;
}

function NotesBlock({ notes }: { notes: string | null | undefined }) {
  if (!notes || notes === '-') return null;
  return (
    <div className="text-sm p-2 rounded-lg bg-background/50 border border-border/30">
      <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
        <StickyNote className="w-3 h-3" /> Notes
      </span>
      <p className="font-medium mt-0.5">{notes}</p>
    </div>
  );
}

function LessonDetails({ notification, lessonDetails, details }: {
  notification: Notification;
  lessonDetails: any;
  details: Record<string, string>;
}) {
  return (
    <div className="space-y-2 mb-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {(lessonDetails?.teacher_name || details.teacher) && (
          <DetailRow label="👨‍🏫 Teacher" value={lessonDetails?.teacher_name || details.teacher} />
        )}
        {lessonDetails?.scheduled_date && (
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Date" value={format(new Date(lessonDetails.scheduled_date), 'dd MMM yyyy')} />
        )}
        {lessonDetails?.scheduled_time && (
          <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Time" value={formatTime12h(lessonDetails.scheduled_time)} />
        )}
        {lessonDetails?.duration_minutes && (
          <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Duration" value={`${lessonDetails.duration_minutes} min`} />
        )}
        <WalletDetail balance={notification.wallet_balance} />
      </div>
      <NotesBlock notes={lessonDetails?.notes || details.notes} />
    </div>
  );
}

function PackageDetails({ notification, packageDetails, details }: {
  notification: Notification;
  packageDetails: any;
  details: Record<string, string>;
}) {
  return (
    <div className="space-y-2 mb-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {packageDetails.package_type_name && (
          <DetailRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Package Type" value={packageDetails.package_type_name} />
        )}
        <DetailRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Lessons" value={`${packageDetails.lessons_purchased} lessons`} />
        {packageDetails.lesson_duration && (
          <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Duration" value={`${packageDetails.lesson_duration} min`} />
        )}
        {packageDetails.lessons_per_week && (
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Per Week" value={`${packageDetails.lessons_per_week}x/week`} />
        )}
        {packageDetails.start_date && (
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Start Date" value={format(new Date(packageDetails.start_date), 'dd MMM yyyy')} />
        )}
        {details.teacher && <DetailRow label="👨‍🏫 Teacher" value={details.teacher} />}
        <WalletDetail balance={notification.wallet_balance} />
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
  );
}

function TrialDetails({ notification, details }: {
  notification: Notification;
  details: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
      {details.teacher && <DetailRow label="Teacher" value={details.teacher} />}
      {details.date && <DetailRow label="Date" value={details.date} />}
      {details.notes && details.notes !== '-' && <DetailRow label="Notes" value={details.notes} />}
      {details.remaining && <DetailRow label="Remaining" value={details.remaining} />}
      <WalletDetail balance={notification.wallet_balance} />
      {details.lessons && <DetailRow label="Package" value={details.lessons} />}
    </div>
  );
}

function NotificationActions({ onNavigate, onWhatsApp, onCopy, copied, navigateLabel, hasRelatedId }: {
  onNavigate: () => void;
  onWhatsApp: () => void;
  onCopy: () => void;
  copied: boolean;
  navigateLabel: string;
  hasRelatedId: boolean;
}) {
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
      {hasRelatedId && (
        <Button size="sm" variant="outline" onClick={onNavigate} className="gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" />
          {navigateLabel}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onWhatsApp} className="gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10">
        <MessageCircle className="w-3.5 h-3.5" />
        WhatsApp
      </Button>
      <Button size="sm" variant="ghost" onClick={onCopy} className="gap-1.5">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

// ===== Main Component =====

export function NotificationCard({ notification }: NotificationCardProps) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const { data: parentPhone } = useParentPhone(notification.related_id, notification.type);
  const { data: packageDetails } = usePackageNotificationDetails(
    notification.related_id, notification.type, notification.created_at
  );
  const { data: lessonDetails } = useLessonNotificationDetails(
    notification.related_id, notification.type, notification.created_at
  );
  const [copied, setCopied] = useState(false);

  const styles = getNotificationStyles(notification.type);
  const details = parseNotificationDetails(notification.message);

  const handleNavigate = () => {
    if (!notification.is_read) markRead.mutate(notification.notification_id);
    if (!notification.related_id) return;
    navigate(notification.type === 'trial_completed' ? '/admin/trial-students' : `/admin/students/${notification.related_id}`);
  };

  const navigateLabel = notification.type === 'trial_completed' ? 'Go to Trial' : 'Go to Student';
  const studentName = notification.student_name || 'Student';

  const shareMessage = useMemo(() => {
    if (notification.type === 'lesson_completed' && lessonDetails) {
      return formatLessonShareMessage(studentName, {
        teacher_name: lessonDetails.teacher_name,
        scheduled_date: lessonDetails.scheduled_date,
        scheduled_time: lessonDetails.scheduled_time,
        duration_minutes: lessonDetails.duration_minutes,
        notes: lessonDetails.notes,
        wallet_balance: notification.wallet_balance,
      });
    }
    if (notification.type === 'new_package' && packageDetails) {
      return formatPackageShareMessage(studentName, {
        package_type_name: packageDetails.package_type_name,
        lessons_purchased: packageDetails.lessons_purchased,
        lesson_duration: packageDetails.lesson_duration,
        lessons_per_week: packageDetails.lessons_per_week,
        start_date: packageDetails.start_date,
        is_renewal: packageDetails.is_renewal,
        description: packageDetails.description,
        schedule: packageDetails.schedule,
        wallet_balance: notification.wallet_balance,
      }, details.teacher);
    }
    return formatWhatsAppMessage(notification.type, studentName, notification.message);
  }, [notification, lessonDetails, packageDetails, studentName, details.teacher]);

  const handleWhatsApp = () => {
    if (!notification.is_read) markRead.mutate(notification.notification_id);
    const phone = parentPhone?.replace(/[^0-9+]/g, '') || '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    toast.success('Message copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isPackage = notification.type === 'new_package' && packageDetails;
  const isLesson = notification.type === 'lesson_completed';

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      notification.is_read ? 'bg-muted/20 border-border/30 opacity-70' : `${styles.bgColor} ${styles.borderColor}`
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{styles.icon}</span>
          <Badge variant="outline" className={styles.badgeClass}>{styles.label}</Badge>
          {isPackage && packageDetails.is_renewal && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1">
              <RefreshCw className="w-3 h-3" /> Renewal
            </Badge>
          )}
          {!notification.is_read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(notification.created_at)}
        </span>
      </div>

      {notification.student_name && (
        <h4 className="font-semibold text-base mb-2">{notification.student_name}</h4>
      )}

      {/* Content by type */}
      {isLesson ? (
        <LessonDetails notification={notification} lessonDetails={lessonDetails} details={details} />
      ) : isPackage ? (
        <PackageDetails notification={notification} packageDetails={packageDetails} details={details} />
      ) : (
        <TrialDetails notification={notification} details={details} />
      )}

      <NotificationActions
        onNavigate={handleNavigate}
        onWhatsApp={handleWhatsApp}
        onCopy={handleCopy}
        copied={copied}
        navigateLabel={navigateLabel}
        hasRelatedId={!!notification.related_id}
      />
    </div>
  );
}
