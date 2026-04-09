import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'student' | 'package' | 'teacher' | 'lead' | 'trial' | 'lesson' | 'payroll' | 'notification' | 'admin' | 'system';

interface AuditLogInput {
  action: string;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function logAdminAction({ action, entityType, entityId, details }: AuditLogInput) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await supabase.from('audit_logs').insert({
      action,
      performed_by: user.id,
      admin_name: profile?.full_name || user.email || 'Unknown',
      entity_type: entityType,
      entity_id: entityId || null,
      details: details as any,
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// React Query hook for fetching audit logs
import { useQuery } from '@tanstack/react-query';

export interface AuditLog {
  log_id: string;
  action: string;
  performed_by: string | null;
  admin_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  target_user: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function useAuditLogs(filters?: {
  admin_id?: string;
  entity_type?: string;
  action?: string;
  date_start?: string;
  date_end?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 200);

      if (filters?.admin_id) {
        query = query.eq('performed_by', filters.admin_id);
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.action) {
        query = query.ilike('action', `%${filters.action}%`);
      }
      if (filters?.date_start) {
        query = query.gte('created_at', filters.date_start);
      }
      if (filters?.date_end) {
        query = query.lte('created_at', filters.date_end + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

// Get distinct admin users who have performed actions
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      
      // Filter to only admins
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminIds = new Set(roles?.map(r => r.user_id) || []);
      return (data || []).filter(p => adminIds.has(p.id));
    },
  });
}
