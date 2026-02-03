import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, format } from 'date-fns';

export type TimePeriod = 'day' | 'week' | 'month';

export interface PerformanceStats {
  period: string;
  newPackages: number;
  completedPackages: number;
  renewals: number;
  totalRevenue: number;
  newStudents: number;
  lessonsDelivered: number;
  trialLessons: number;
  conversionRate: number;
}

export interface PerformanceSummary {
  currentPeriod: PerformanceStats;
  previousPeriod: PerformanceStats;
  trend: {
    revenue: number;
    packages: number;
    students: number;
    lessons: number;
  };
  periodData: PerformanceStats[];
}

function getDateRange(period: TimePeriod, offset = 0) {
  const now = new Date();
  
  switch (period) {
    case 'day':
      const day = subDays(now, offset);
      return {
        start: startOfDay(day),
        end: endOfDay(day),
        label: format(day, 'MMM d, yyyy'),
      };
    case 'week':
      const weekStart = startOfWeek(subWeeks(now, offset), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(subWeeks(now, offset), { weekStartsOn: 0 });
      return {
        start: weekStart,
        end: weekEnd,
        label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      };
    case 'month':
      const monthDate = subMonths(now, offset);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
        label: format(monthDate, 'MMMM yyyy'),
      };
  }
}

export function usePerformanceStats(period: TimePeriod = 'month', periodsToShow = 6) {
  return useQuery({
    queryKey: ['performance-stats', period, periodsToShow],
    queryFn: async (): Promise<PerformanceSummary> => {
      const periodData: PerformanceStats[] = [];

      // Fetch data for each period
      for (let i = periodsToShow - 1; i >= 0; i--) {
        const { start, end, label } = getDateRange(period, i);
        const startStr = start.toISOString();
        const endStr = end.toISOString();

        // Parallel queries for this period
        const [
          packagesResult,
          studentsResult,
          lessonsResult,
          trialsResult,
        ] = await Promise.all([
          // Packages in this period
          supabase
            .from('packages')
            .select('package_id, amount, is_renewal, status')
            .gte('created_at', startStr)
            .lte('created_at', endStr),

          // New students in this period
          supabase
            .from('students')
            .select('student_id')
            .gte('created_at', startStr)
            .lte('created_at', endStr),

          // Lessons delivered in this period
          supabase
            .from('lessons_log')
            .select('lesson_id, status')
            .gte('date', startStr)
            .lte('date', endStr)
            .eq('status', 'Taken'),

          // Trial lessons in this period
          supabase
            .from('trial_students')
            .select('trial_id, status')
            .gte('created_at', startStr)
            .lte('created_at', endStr),
        ]);

        const packages = packagesResult.data || [];
        const students = studentsResult.data || [];
        const lessons = lessonsResult.data || [];
        const trials = trialsResult.data || [];

        const newPackages = packages.filter(p => !p.is_renewal).length;
        const renewals = packages.filter(p => p.is_renewal).length;
        const completedPackages = packages.filter(p => p.status === 'Completed').length;
        const totalRevenue = packages.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const totalTrials = trials.length;
        const convertedTrials = trials.filter(t => t.status === 'Converted').length;
        const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

        periodData.push({
          period: label,
          newPackages,
          completedPackages,
          renewals,
          totalRevenue,
          newStudents: students.length,
          lessonsDelivered: lessons.length,
          trialLessons: totalTrials,
          conversionRate,
        });
      }

      const currentPeriod = periodData[periodData.length - 1];
      const previousPeriod = periodData.length > 1 ? periodData[periodData.length - 2] : currentPeriod;

      // Calculate trends (percentage change)
      const calcTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        currentPeriod,
        previousPeriod,
        trend: {
          revenue: calcTrend(currentPeriod.totalRevenue, previousPeriod.totalRevenue),
          packages: calcTrend(
            currentPeriod.newPackages + currentPeriod.renewals,
            previousPeriod.newPackages + previousPeriod.renewals
          ),
          students: calcTrend(currentPeriod.newStudents, previousPeriod.newStudents),
          lessons: calcTrend(currentPeriod.lessonsDelivered, previousPeriod.lessonsDelivered),
        },
        periodData,
      };
    },
    refetchInterval: 60000,
  });
}
