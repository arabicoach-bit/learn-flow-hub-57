import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BookOpen, Clock, Wallet } from 'lucide-react';
import { formatSalary } from '@/lib/wallet-utils';
import { useTeacherTotalHours } from '@/hooks/use-teacher-total-hours';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function TeacherStatsBar() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;
  const queryClient = useQueryClient();

  // Current month date range
  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: stats } = useTeacherTotalHours(teacherId, startDate, endDate);

  // Real-time subscription to scheduled_lessons changes
  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel('teacher-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_lessons',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-total-hours', teacherId] });
          queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons', teacherId] });
          queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked', teacherId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trial_lessons_log',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-total-hours', teacherId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, queryClient]);

  const lessons = stats?.totalLessons || 0;
  const hours = stats?.totalHours?.toFixed(1) || '0';
  const salary = stats?.salary || 0;

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-emerald-600/10 border border-emerald-600/20 rounded-lg text-sm">
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-4 h-4 text-emerald-400" />
        <span className="text-muted-foreground">Lessons:</span>
        <span className="font-bold">{lessons}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-emerald-400" />
        <span className="text-muted-foreground">Hours:</span>
        <span className="font-bold">{hours}h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Wallet className="w-4 h-4 text-emerald-400" />
        <span className="text-muted-foreground">Salary:</span>
        <span className="font-bold text-emerald-400">{formatSalary(salary)}</span>
      </div>
    </div>
  );
}
