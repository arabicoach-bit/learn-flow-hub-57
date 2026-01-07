import { useEffect, useState } from 'react';
import { Bell, Check, ExternalLink, Volume2, VolumeX, AlertTriangle, Ban } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, Notification as AppNotification } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatRelativeTime, getNotificationStyles, formatNotificationType } from '@/lib/notification-utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications(50);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('notification-sound') !== 'false';
  });
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [prevNotificationCount, setPrevNotificationCount] = useState(0);

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Play sound and show browser notification for new critical alerts
  useEffect(() => {
    if (!notifications) return;
    
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    // Check for new notifications
    if (unreadCount > prevNotificationCount && prevNotificationCount > 0) {
      const newNotifications = notifications.filter(n => !n.is_read).slice(0, unreadCount - prevNotificationCount);
      
      for (const notification of newNotifications) {
        // Show browser notification for critical alerts
        if (notification.type === 'blocked' && browserNotificationsEnabled) {
          showBrowserNotification(notification);
        }
        
        // Play sound for blocked notifications
        if (notification.type === 'blocked' && soundEnabled) {
          playAlertSound();
        }
      }
    }
    
    setPrevNotificationCount(unreadCount);
  }, [notifications, prevNotificationCount, soundEnabled, browserNotificationsEnabled]);

  const requestBrowserNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast.success('Browser notifications enabled!');
      } else {
        toast.error('Browser notifications were denied');
      }
    }
  };

  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('notification-sound', enabled.toString());
  };

  const playAlertSound = () => {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const showBrowserNotification = (notification: AppNotification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const styles = getNotificationStyles(notification.type);
      new Notification(`${styles.icon} ${formatNotificationType(notification.type)}`, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.notification_id,
        requireInteraction: notification.type === 'blocked',
      });
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.notification_id);
    }
    
    // Navigate to student detail if there's a related_id
    if (notification.related_id) {
      navigate(`/students/${notification.related_id}`);
    }
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Stay updated with important alerts</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={toggleSound}
              />
              <Label htmlFor="sound" className="flex items-center gap-1 cursor-pointer">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline">Sound</span>
              </Label>
            </div>
            {!browserNotificationsEnabled && 'Notification' in window && (
              <Button variant="outline" size="sm" onClick={requestBrowserNotifications}>
                <Bell className="w-4 h-4 mr-2" />
                Enable Alerts
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => markAllRead.mutate()} 
              disabled={markAllRead.isPending || unreadCount === 0}
            >
              <Check className="w-4 h-4 mr-2" /> Mark All Read
            </Button>
          </div>
        </div>

        {/* Notification Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive">
            <Ban className="w-3 h-3" /> Blocked (Critical)
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-3 h-3" /> Grace Mode (High)
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
            💰 Low Balance (Medium)
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
            📅 Follow-up (Normal)
          </span>
        </div>

        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : notifications?.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications?.map((notification) => {
                const styles = getNotificationStyles(notification.type);
                
                return (
                  <div
                    key={notification.notification_id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                      notification.is_read
                        ? 'bg-muted/20 border-border/30 opacity-60'
                        : `${styles.bgColor} ${styles.borderColor}`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{styles.icon}</span>
                          {notification.student_name && (
                            <span className="font-medium text-sm">{notification.student_name}</span>
                          )}
                          {notification.wallet_balance !== null && notification.wallet_balance !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              Balance: {notification.wallet_balance}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={styles.badgeClass}>
                          {formatNotificationType(notification.type)}
                        </Badge>
                        <div className="flex items-center gap-2">
                          {notification.related_id && (
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          )}
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
