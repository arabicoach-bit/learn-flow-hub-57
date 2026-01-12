import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  graceStudents: number;
  blockedStudents: number;
  temporaryStopStudents: number;
  // Payment status
  paidStudents: number;
  overdueStudents: number;
  dueSoonStudents: number;
  // Financials
  totalOutstandingBalance: number;
  totalMonthlyRevenue: number;
  averageMonthlyFee: number;
  // Package breakdown
  packageBreakdown: {
    light: number;
    standard: number;
    premium: number;
    bestValue: number;
  };
  // Arabic level breakdown
  arabicAStudents: number;
  arabicBStudents: number;
}

export interface TeacherPerformance {
  teacher_id: string;
  name: string;
  email: string | null;
  rate_per_lesson: number;
  is_active: boolean;
  // Monthly metrics
  totalTeachingHours: number;
  lessonsThisMonth: number;
  salary: number;
  // Student metrics
  activeStudents: number;
  studentsLeft: number;
  retentionRate: number;
  // Trial metrics
  trialsScheduled: number;
  successfulRegistrations: number;
  trialConversionRate: number;
  // Performance
  performanceRating: 'Excellent' | 'Good' | 'Average' | 'Poor';
  bonus: number;
}

export interface AdminDashboardStats {
  studentStats: StudentStats;
  teacherPerformance: TeacherPerformance[];
  // KPIs
  totalLeads: number;
  trialsShouldBeScheduled: number;
  conversionRate: number;
  pendingFollowups: number;
}

export function useStudentStats() {
  return useQuery({
    queryKey: ['admin-student-stats'],
    queryFn: async () => {
      // Fetch all students with their package information
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          student_id,
          name,
          status,
          wallet_balance,
          teacher_id,
          teachers (name)
        `);

      if (studentsError) throw studentsError;

      // Fetch packages with payment info
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('status', 'Active');

      if (packagesError) throw packagesError;

      // Calculate stats
      const totalStudents = students?.length || 0;
      const activeStudents = students?.filter(s => s.status === 'Active').length || 0;
      const graceStudents = students?.filter(s => s.status === 'Grace').length || 0;
      const blockedStudents = students?.filter(s => s.status === 'Blocked').length || 0;
      const temporaryStopStudents = 0; // Would need status field extension

      // Calculate outstanding balance (students with wallet_balance <= 0)
      const totalOutstandingBalance = students
        ?.filter(s => (s.wallet_balance || 0) <= 0)
        .reduce((sum, s) => sum + Math.abs(s.wallet_balance || 0), 0) || 0;

      // Total monthly revenue from active packages
      const totalMonthlyRevenue = packages?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const averageMonthlyFee = activeStudents > 0 ? totalMonthlyRevenue / activeStudents : 0;

      // Payment status based on wallet balance
      const paidStudents = students?.filter(s => (s.wallet_balance || 0) >= 4).length || 0;
      const dueSoonStudents = students?.filter(s => (s.wallet_balance || 0) >= 1 && (s.wallet_balance || 0) <= 3).length || 0;
      const overdueStudents = students?.filter(s => (s.wallet_balance || 0) <= 0).length || 0;

      const stats: StudentStats = {
        totalStudents,
        activeStudents,
        graceStudents,
        blockedStudents,
        temporaryStopStudents,
        paidStudents,
        overdueStudents,
        dueSoonStudents,
        totalOutstandingBalance,
        totalMonthlyRevenue,
        averageMonthlyFee,
        packageBreakdown: {
          light: 0,
          standard: 0,
          premium: 0,
          bestValue: 0,
        },
        arabicAStudents: 0,
        arabicBStudents: totalStudents, // Default all to B for now
      };

      return stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useTeacherPerformance() {
  return useQuery({
    queryKey: ['admin-teacher-performance'],
    queryFn: async () => {
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Fetch all teachers
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (teachersError) throw teachersError;

      // Fetch lessons for this month
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons_log')
        .select('*')
        .gte('lesson_date', startDate)
        .lte('lesson_date', endDate)
        .eq('status', 'Taken');

      if (lessonsError) throw lessonsError;

      // Fetch students per teacher
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('student_id, teacher_id, status');

      if (studentsError) throw studentsError;

      // Calculate performance for each teacher
      const performance: TeacherPerformance[] = teachers?.map((teacher) => {
        const teacherLessons = lessons?.filter(l => l.teacher_id === teacher.teacher_id) || [];
        const teacherStudents = students?.filter(s => s.teacher_id === teacher.teacher_id) || [];
        const activeTeacherStudents = teacherStudents.filter(s => s.status === 'Active' || s.status === 'Grace');

        // Assuming 45min average lesson duration
        const totalTeachingHours = teacherLessons.length * 0.75;
        const salary = totalTeachingHours * (teacher.rate_per_lesson || 0);

        // Calculate retention (students that haven't left)
        const retentionRate = teacherStudents.length > 0 
          ? (activeTeacherStudents.length / teacherStudents.length) * 100 
          : 100;

        // Performance rating based on retention and lessons
        let performanceRating: TeacherPerformance['performanceRating'] = 'Average';
        if (retentionRate >= 90 && teacherLessons.length >= 20) {
          performanceRating = 'Excellent';
        } else if (retentionRate >= 75 && teacherLessons.length >= 10) {
          performanceRating = 'Good';
        } else if (retentionRate < 60) {
          performanceRating = 'Poor';
        }

        return {
          teacher_id: teacher.teacher_id,
          name: teacher.name,
          email: teacher.email,
          rate_per_lesson: teacher.rate_per_lesson || 0,
          is_active: teacher.is_active ?? true,
          totalTeachingHours,
          lessonsThisMonth: teacherLessons.length,
          salary,
          activeStudents: activeTeacherStudents.length,
          studentsLeft: 0, // Would need historical tracking
          retentionRate,
          trialsScheduled: 0, // Would need trials tracking
          successfulRegistrations: 0,
          trialConversionRate: 0,
          performanceRating,
          bonus: performanceRating === 'Excellent' ? salary * 0.1 : 0,
        };
      }) || [];

      return performance;
    },
    refetchInterval: 30000,
  });
}

export function useAdminDashboardSummary() {
  return useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: async () => {
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Get leads count
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Get leads that need follow-up
      const { count: pendingFollowups } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .lte('next_followup_date', new Date().toISOString())
        .neq('status', 'Converted')
        .neq('status', 'Lost');

      // Get converted leads this month
      const { count: convertedThisMonth } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Converted')
        .gte('updated_at', startDate);

      // Calculate conversion rate
      const conversionRate = totalLeads && totalLeads > 0 
        ? ((convertedThisMonth || 0) / totalLeads) * 100 
        : 0;

      return {
        totalLeads: totalLeads || 0,
        pendingFollowups: pendingFollowups || 0,
        conversionRate,
        trialsShouldBeScheduled: 0, // Would need trial scheduling feature
      };
    },
    refetchInterval: 30000,
  });
}
