import { useState } from 'react';
import { ExternalLink, Copy, Check, MessageCircle } from 'lucide-react';
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

interface NotificationCardProps {
  notification: Notification;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const { data: parentPhone } = useParentPhone(notification.related_id, notification.type);
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

      {/* Detail grid */}
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
