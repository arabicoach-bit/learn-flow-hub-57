import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const ACTIVE_TYPES = [
  'lesson_completed', 'trial_completed', 'new_package',
  'low_balance', 'grace_mode', 'blocked', 'renewal_due',
  'followup_due', 'unmarked_lesson_reminder', 'daily_summary',
] as const;

export type NotificationType = typeof ACTIVE_TYPES[number];

export interface Notification {
  notification_id: string;
  type: NotificationType;
  related_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  student_name?: string | null;
  wallet_balance?: number | null;
}

export interface NotificationFilters {
  type?: string;
  startDate?: string | null;
  endDate?: string | null;
  teacherId?: string | null;
  limit?: number;
}

export function useNotifications(filters: NotificationFilters = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      let studentIds: string[] | null = null;

      // If teacher filter, get that teacher's student IDs + trial IDs
      if (filters.teacherId) {
        const { data: students } = await supabase
          .from('students').select('student_id').eq('teacher_id', filters.teacherId);
        const { data: trials } = await supabase
          .from('trial_students').select('trial_id').eq('teacher_id', filters.teacherId);
        studentIds = [
          ...(students?.map(s => s.student_id) || []),
          ...(trials?.map(t => t.trial_id) || []),
        ];
        if (studentIds.length === 0) return [];
      }

      let query = supabase
        .from('notifications')
        .select('*')
        .in('type', filters.type && filters.type !== 'all' ? [filters.type] as any : [...ACTIVE_TYPES] as any)
        .order('created_at', { ascending: false });

      if (filters.startDate) query = query.gte('created_at', filters.startDate + 'T00:00:00');
      if (filters.endDate) query = query.lte('created_at', filters.endDate + 'T23:59:59');
      if (studentIds) query = query.in('related_id', studentIds);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('notification_id', { count: 'exact', head: true })
        .eq('is_read', false)
        .in('type', [...ACTIVE_TYPES]);
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useTeacherNotifications(teacherId: string | null | undefined) {
  return useQuery({
    queryKey: ['teacher-notifications', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data: students } = await supabase
        .from('students').select('student_id').eq('teacher_id', teacherId);
      const { data: trialStudents } = await supabase
        .from('trial_students').select('trial_id').eq('teacher_id', teacherId);
      const allIds = [
        teacherId, // include teacher's own ID for unmarked_lesson_reminder
        ...(students?.map(s => s.student_id) || []),
        ...(trialStudents?.map(t => t.trial_id) || []),
      ];
      if (allIds.length === 0) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .in('related_id', allIds)
        .in('type', [...ACTIVE_TYPES])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!teacherId,
  });
}

export function useTeacherUnreadCount(teacherId: string | null | undefined) {
  return useQuery({
    queryKey: ['teacher-unread-count', teacherId],
    queryFn: async () => {
      if (!teacherId) return 0;
      const { data: students } = await supabase
        .from('students').select('student_id').eq('teacher_id', teacherId);
      const { data: trialStudents } = await supabase
        .from('trial_students').select('trial_id').eq('teacher_id', teacherId);
      const allIds = [
        ...(students?.map(s => s.student_id) || []),
        ...(trialStudents?.map(t => t.trial_id) || []),
      ];
      if (allIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('notification_id', { count: 'exact', head: true })
        .eq('is_read', false)
        .in('related_id', allIds)
        .in('type', [...ACTIVE_TYPES]);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!teacherId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('notification_id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)
        .in('type', [...ACTIVE_TYPES]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-unread-count'] });
    },
  });
}

// Fetch parent phone for WhatsApp sharing
export function useParentPhone(relatedId: string | null, type: string) {
  return useQuery({
    queryKey: ['parent-phone', relatedId, type],
    queryFn: async () => {
      if (!relatedId) return null;
      if (type === 'trial_completed') {
        const { data } = await supabase
          .from('trial_students').select('phone').eq('trial_id', relatedId).maybeSingle();
        return data?.phone || null;
      }
      const { data } = await supabase
        .from('students').select('phone').eq('student_id', relatedId).maybeSingle();
      return data?.phone || null;
    },
    enabled: !!relatedId,
  });
}
