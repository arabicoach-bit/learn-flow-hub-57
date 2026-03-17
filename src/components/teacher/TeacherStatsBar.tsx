import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BookOpen, Clock, Wallet, GraduationCap, TrendingUp } from 'lucide-react';
import { formatSalary } from '@/lib/wallet-utils';
import { useTeacherTotalHours } from '@/hooks/use-teacher-total-hours';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function ProgressRing({ value, max, size = 40, strokeWidth = 3.5, color }: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export function TeacherStatsBar() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;
  const queryClient = useQueryClient();

  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: stats } = useTeacherTotalHours(teacherId, startDate, endDate);

  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel('teacher-stats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_lessons', filter: `teacher_id=eq.${teacherId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-total-hours', teacherId] });
          queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons', teacherId] });
          queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked', teacherId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trial_lessons_log', filter: `teacher_id=eq.${teacherId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-total-hours', teacherId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, queryClient]);

  const regularLessons = stats?.regularLessons || 0;
  const trialLessons = stats?.trialLessons || 0;
  const totalLessons = stats?.totalLessons || 0;
  const regularHours = stats?.regularHours || 0;
  const trialHours = stats?.trialHours || 0;
  const totalHours = stats?.totalHours || 0;
  const salary = stats?.salary || 0;
  const rate = stats?.ratePerHour || 0;

  const monthLabel = format(now, 'MMM yyyy');

  return (
    <div className="grid grid-cols-4 gap-2">
      {/* Lessons */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 shrink-0">
          <BookOpen className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{totalLessons}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Lessons</p>
          <p className="text-[9px] text-muted-foreground/60 leading-tight">{regularLessons} reg · {trialLessons} trial</p>
        </div>
      </div>

      {/* Hours */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-blue-500/5 border-blue-500/20">
        <div className="p-1.5 rounded-lg bg-blue-500/10 shrink-0">
          <Clock className="w-5 h-5 text-blue-500" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{totalHours.toFixed(1)}h</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Hours</p>
          <p className="text-[9px] text-muted-foreground/60 leading-tight">{regularHours.toFixed(1)} + {trialHours.toFixed(1)} trial</p>
        </div>
      </div>

      {/* Salary */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-amber-500/5 border-amber-500/20">
        <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
          <Wallet className="w-5 h-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-amber-500">{formatSalary(salary)}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Salary</p>
          <p className="text-[9px] text-muted-foreground/60 leading-tight">Rate: {formatSalary(rate)}/h</p>
        </div>
      </div>

      {/* Month Label */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-muted/30">
        <div className="p-1.5 rounded-lg bg-muted/60 shrink-0">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">{monthLabel}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Current Period</p>
          <p className="text-[9px] text-muted-foreground/60 leading-tight">{totalHours > 0 ? `${(salary / totalHours).toFixed(0)} AED/h avg` : '—'}</p>
        </div>
      </div>
    </div>
  );
}
