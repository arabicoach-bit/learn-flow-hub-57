import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface LessonsCellProps {
  studentId: string;
}

export function LessonsCell({ studentId }: LessonsCellProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-lessons-summary', studentId],
    queryFn: async () => {
      // Get active package
      const { data: pkg } = await supabase
        .from('packages')
        .select('package_id, lessons_purchased')
        .eq('student_id', studentId)
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pkg) return null;

      // Count used lessons (completed + absent)
      const { count } = await supabase
        .from('scheduled_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('package_id', pkg.package_id)
        .in('status', ['completed', 'absent']);

      return { used: count || 0, total: pkg.lessons_purchased };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-4 w-12" />;
  if (!data) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="text-sm font-medium">
      {data.used}/{data.total}
    </span>
  );
}
