import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Notification {
  notification_id: string;
  type: 'low_balance' | 'grace_mode' | 'blocked' | 'renewal_due' | 'followup_due' 
    | 'unmarked_lesson_reminder' | 'lesson_completed' | 'trial_completed' | 'new_package' | 'daily_summary';
  related_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  student_name?: string | null;
  wallet_balance?: number | null;
}

export function useNotifications(limit = 10) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
        queryClient.invalidateQueries({ queryKey: ['teacher-unread-count'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
        queryClient.invalidateQueries({ queryKey: ['teacher-unread-count'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('is_read', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useAllNotifications() {
  return useQuery({
    queryKey: ['notifications-all'],
    queryFn: async () => {
      // Auto-clean old lesson/package notifications
      await supabase
        .from('notifications')
        .delete()
        .in('type', ['lesson_completed', 'new_package'])
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('is_read', { ascending: true })
        .order('created_at', { ascending: false });
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
        .eq('is_read', false);
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
      
      // Get student IDs for this teacher
      const { data: students } = await supabase
        .from('students')
        .select('student_id')
        .eq('teacher_id', teacherId);
      
      const studentIds = students?.map(s => s.student_id) || [];
      
      // Get trial student IDs for this teacher
      const { data: trialStudents } = await supabase
        .from('trial_students')
        .select('trial_id')
        .eq('teacher_id', teacherId);
      
      const trialIds = trialStudents?.map(t => t.trial_id) || [];
      
      const allIds = [...studentIds, ...trialIds];
      if (allIds.length === 0) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .in('related_id', allIds)
        .order('is_read', { ascending: true })
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
        .from('students')
        .select('student_id')
        .eq('teacher_id', teacherId);
      
      const { data: trialStudents } = await supabase
        .from('trial_students')
        .select('trial_id')
        .eq('teacher_id', teacherId);
      
      const allIds = [
        ...(students?.map(s => s.student_id) || []),
        ...(trialStudents?.map(t => t.trial_id) || []),
      ];
      if (allIds.length === 0) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('notification_id', { count: 'exact', head: true })
        .eq('is_read', false)
        .in('related_id', allIds);
      
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
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
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
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-unread-count'] });
    },
  });
}

export function useDeleteReadNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
