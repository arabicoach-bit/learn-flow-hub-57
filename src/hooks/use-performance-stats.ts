import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface PerformanceStats {
  period: string;
  newPackages: number;
  finishedPackages: number;
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
  isAllTime: boolean;
}

async function fetchPeriodStats(startStr: string, endStr: string, label: string): Promise<PerformanceStats> {
  const [packagesResult, studentsResult, lessonsResult, trialsResult] = await Promise.all([
    supabase
      .from('packages')
      .select('package_id, amount, is_renewal, status')
      .gte('created_at', startStr)
      .lte('created_at', endStr),
    supabase
      .from('students')
      .select('student_id')
      .gte('created_at', startStr)
      .lte('created_at', endStr),
    supabase
      .from('scheduled_lessons')
      .select('scheduled_lesson_id, status')
      .gte('scheduled_date', startStr.split('T')[0])
      .lte('scheduled_date', endStr.split('T')[0])
      .eq('status', 'completed'),
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

  return {
    period: label,
    newPackages,
    completedPackages,
    renewals,
    totalRevenue,
    newStudents: students.length,
    lessonsDelivered: lessons.length,
    trialLessons: totalTrials,
    conversionRate,
  };
}

export function usePerformanceStats(startDate: string | null, endDate: string | null) {
  return useQuery({
    queryKey: ['performance-stats', startDate, endDate],
    queryFn: async (): Promise<PerformanceSummary> => {
      const isAllTime = !startDate || !endDate;

      // Determine the reference month for chart data
      let refDate: Date;
      if (!isAllTime && startDate) {
        refDate = new Date(startDate);
      } else {
        refDate = new Date();
      }

      // Generate 6 monthly buckets ending at refDate's month
      const periodData: PerformanceStats[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(refDate, i);
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        const label = format(monthDate, 'MMM yyyy');
        const stats = await fetchPeriodStats(mStart.toISOString(), mEnd.toISOString(), label);
        periodData.push(stats);
      }

      // Current period stats = filtered range (or last month if all time)
      let currentPeriod: PerformanceStats;
      if (isAllTime) {
        // Sum all 6 months for "current" display
        currentPeriod = periodData.reduce(
          (acc, p) => ({
            period: 'All Time',
            newPackages: acc.newPackages + p.newPackages,
            completedPackages: acc.completedPackages + p.completedPackages,
            renewals: acc.renewals + p.renewals,
            totalRevenue: acc.totalRevenue + p.totalRevenue,
            newStudents: acc.newStudents + p.newStudents,
            lessonsDelivered: acc.lessonsDelivered + p.lessonsDelivered,
            trialLessons: acc.trialLessons + p.trialLessons,
            conversionRate: 0,
          }),
          {
            period: 'All Time',
            newPackages: 0, completedPackages: 0, renewals: 0,
            totalRevenue: 0, newStudents: 0, lessonsDelivered: 0,
            trialLessons: 0, conversionRate: 0,
          }
        );
        // Recalc conversion rate
        const totalTrials = periodData.reduce((s, p) => s + p.trialLessons, 0);
        if (totalTrials > 0) {
          const totalConverted = periodData.reduce((s, p) => s + (p.trialLessons * p.conversionRate / 100), 0);
          currentPeriod.conversionRate = (totalConverted / totalTrials) * 100;
        }
      } else {
        currentPeriod = await fetchPeriodStats(
          new Date(startDate!).toISOString(),
          new Date(endDate! + 'T23:59:59').toISOString(),
          format(new Date(startDate!), 'MMM yyyy')
        );
      }

      // Previous period = month before selected
      const prevMonth = subMonths(refDate, 1);
      const previousPeriod = await fetchPeriodStats(
        startOfMonth(prevMonth).toISOString(),
        endOfMonth(prevMonth).toISOString(),
        format(prevMonth, 'MMM yyyy')
      );

      const calcTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        currentPeriod,
        previousPeriod,
        trend: {
          revenue: calcTrend(currentPeriod.totalRevenue, previousPeriod.totalRevenue),
          packages: calcTrend(currentPeriod.newPackages + currentPeriod.renewals, previousPeriod.newPackages + previousPeriod.renewals),
          students: calcTrend(currentPeriod.newStudents, previousPeriod.newStudents),
          lessons: calcTrend(currentPeriod.lessonsDelivered, previousPeriod.lessonsDelivered),
        },
        periodData,
        isAllTime,
      };
    },
    refetchInterval: 60000,
  });
}
