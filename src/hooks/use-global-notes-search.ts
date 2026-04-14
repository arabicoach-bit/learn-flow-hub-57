import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalNote {
  comment_id: string;
  comment: string;
  created_at: string;
  author_name: string | null;
  entity_type: 'lead' | 'trial' | 'student' | 'package';
  entity_id: string;
  entity_name: string;
  is_pinned: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
}

export function useGlobalNotesSearch(search: string, entityFilter: string) {
  return useQuery({
    queryKey: ['global-notes-search', search, entityFilter],
    enabled: search.length >= 2,
    queryFn: async () => {
      const results: GlobalNote[] = [];
      const searchTerm = `%${search}%`;

      const tables = [
        { table: 'lead_comments', idCol: 'lead_id', type: 'lead' as const, nameTable: 'leads', nameCol: 'name', fk: 'lead_comments_lead_id_fkey' },
        { table: 'trial_comments', idCol: 'trial_id', type: 'trial' as const, nameTable: 'trial_students', nameCol: 'name', fk: 'trial_comments_trial_id_fkey' },
        { table: 'student_comments', idCol: 'student_id', type: 'student' as const, nameTable: 'students', nameCol: 'name', fk: 'student_comments_student_id_fkey' },
        { table: 'package_comments', idCol: 'package_id', type: 'package' as const, nameTable: null, nameCol: null, fk: null },
      ];

      const filteredTables = entityFilter === 'all' ? tables : tables.filter(t => t.type === entityFilter);

      for (const t of filteredTables) {
        const { data, error } = await supabase
          .from(t.table as any)
          .select('comment_id, comment, created_at, is_pinned, attachment_url, attachment_name, profiles(full_name), ' + t.idCol)
          .ilike('comment', searchTerm)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error || !data) continue;

        // Get entity names
        const entityIds = [...new Set((data as any[]).map((d: any) => d[t.idCol]))];
        let nameMap: Record<string, string> = {};

        if (t.nameTable && entityIds.length > 0) {
          const idField = t.type === 'lead' ? 'lead_id' : t.type === 'trial' ? 'trial_id' : 'student_id';
          const { data: entities } = await supabase
            .from(t.nameTable as any)
            .select(`${idField}, name`)
            .in(idField, entityIds);
          if (entities) {
            (entities as any[]).forEach((e: any) => {
              nameMap[e[idField]] = e.name;
            });
          }
        } else if (t.type === 'package' && entityIds.length > 0) {
          const { data: pkgs } = await supabase
            .from('packages')
            .select('package_id, students(name)')
            .in('package_id', entityIds);
          if (pkgs) {
            (pkgs as any[]).forEach((p: any) => {
              nameMap[p.package_id] = p.students?.name || 'Unknown';
            });
          }
        }

        (data as any[]).forEach((d: any) => {
          results.push({
            comment_id: d.comment_id,
            comment: d.comment,
            created_at: d.created_at,
            author_name: d.profiles?.full_name || null,
            entity_type: t.type,
            entity_id: d[t.idCol],
            entity_name: nameMap[d[t.idCol]] || 'Unknown',
            is_pinned: d.is_pinned,
            attachment_url: d.attachment_url,
            attachment_name: d.attachment_name,
          });
        });
      }

      // Sort by date descending
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return results;
    },
  });
}
