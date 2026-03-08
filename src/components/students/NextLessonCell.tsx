import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface NextLessonCellProps {
  studentId: string;
}

export function NextLessonCell({ studentId }: NextLessonCellProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-next-lesson', studentId],
    queryFn: async () => {
      const { data: lesson } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_date, scheduled_time')
        .eq('student_id', studentId)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      return lesson;
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (!data) return <span className="text-muted-foreground">—</span>;

  const dateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);

  return (
    <span className="text-sm">
      {format(dateTime, 'dd MMM yy HH:mm')}
    </span>
  );
}
