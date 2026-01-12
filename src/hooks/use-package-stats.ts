import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackageStats {
  totalPackages: number;
  activePackages: number;
  completedPackages: number;
  completionRate: number;
  totalRenewals: number;
  renewalRate: number;
  averageLessonsPerPackage: number;
  totalRevenue: number;
  averagePackageValue: number;
  monthlyStats: MonthlyStats[];
}

export interface MonthlyStats {
  month: string;
  newPackages: number;
  completedPackages: number;
  renewals: number;
  revenue: number;
}

export function usePackageStats() {
  return useQuery({
    queryKey: ['package-stats'],
    queryFn: async (): Promise<PackageStats> => {
      // Fetch all packages
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      // Fetch all students for renewal data
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('student_id, number_of_renewals, total_paid');

      if (studentsError) throw studentsError;

      const allPackages = packages || [];
      const allStudents = students || [];

      // Calculate basic stats
      const totalPackages = allPackages.length;
      const activePackages = allPackages.filter(p => p.status === 'Active').length;
      const completedPackages = allPackages.filter(p => p.status === 'Completed').length;
      const completionRate = totalPackages > 0 ? (completedPackages / totalPackages) * 100 : 0;

      // Calculate renewal stats
      const renewalPackages = allPackages.filter(p => p.is_renewal === true).length;
      const nonRenewalPackages = allPackages.filter(p => p.is_renewal !== true).length;
      const renewalRate = nonRenewalPackages > 0 
        ? (renewalPackages / (renewalPackages + nonRenewalPackages)) * 100 
        : 0;

      // Calculate total renewals from students
      const totalRenewals = allStudents.reduce((sum, s) => sum + (s.number_of_renewals || 0), 0);

      // Calculate lesson stats
      const totalLessons = allPackages.reduce((sum, p) => sum + (p.lessons_purchased || 0), 0);
      const averageLessonsPerPackage = totalPackages > 0 ? totalLessons / totalPackages : 0;

      // Calculate revenue stats
      const totalRevenue = allPackages.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const averagePackageValue = totalPackages > 0 ? totalRevenue / totalPackages : 0;

      // Calculate monthly stats for last 6 months
      const monthlyStats = calculateMonthlyStats(allPackages);

      return {
        totalPackages,
        activePackages,
        completedPackages,
        completionRate,
        totalRenewals,
        renewalRate,
        averageLessonsPerPackage,
        totalRevenue,
        averagePackageValue,
        monthlyStats,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

function calculateMonthlyStats(packages: any[]): MonthlyStats[] {
  const months: MonthlyStats[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const monthPackages = packages.filter(p => {
      const createdAt = new Date(p.created_at);
      return createdAt >= monthStart && createdAt <= monthEnd;
    });

    const completedInMonth = packages.filter(p => {
      if (!p.completed_date) return false;
      const completedAt = new Date(p.completed_date);
      return completedAt >= monthStart && completedAt <= monthEnd;
    });

    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      newPackages: monthPackages.length,
      completedPackages: completedInMonth.length,
      renewals: monthPackages.filter(p => p.is_renewal === true).length,
      revenue: monthPackages.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    });
  }

  return months;
}
