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
  temporaryStopStudents: number;
  leftStudents: number;
  trialLessons: number;
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

      // Payment status based on new wallet thresholds
      // Active: >= 3 (Paid), Grace: 2 to -1 (Due Soon), Blocked: <= -2 (Overdue)
      const paidStudents = students?.filter(s => (s.wallet_balance || 0) >= 3).length || 0;
      const dueSoonStudents = students?.filter(s => (s.wallet_balance || 0) >= -1 && (s.wallet_balance || 0) <= 2).length || 0;
      const overdueStudents = students?.filter(s => (s.wallet_balance || 0) <= -2).length || 0;

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

      // Fetch completed lessons from scheduled_lessons (only completed count toward salary)
      const { data: completedLessons, error: lessonsError } = await supabase
        .from('scheduled_lessons')
        .select('teacher_id, duration_minutes')
        .eq('status', 'completed')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (lessonsError) throw lessonsError;

      // Fetch students per teacher
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('student_id, teacher_id, status');

      if (studentsError) throw studentsError;

      // Fetch trial students per teacher
      const { data: trialStudents, error: trialError } = await supabase
        .from('trial_students')
        .select('trial_id, teacher_id, status')
        .eq('status', 'Scheduled');

      if (trialError) throw trialError;

      // Aggregate completed lessons per teacher
      const teacherLessonStats: Record<string, { count: number; totalMinutes: number }> = {};
      completedLessons?.forEach(l => {
        if (l.teacher_id) {
          if (!teacherLessonStats[l.teacher_id]) {
            teacherLessonStats[l.teacher_id] = { count: 0, totalMinutes: 0 };
          }
          teacherLessonStats[l.teacher_id].count += 1;
          teacherLessonStats[l.teacher_id].totalMinutes += l.duration_minutes || 45;
        }
      });

      // Calculate performance for each teacher
      const performance: TeacherPerformance[] = teachers?.map((teacher) => {
        const stats = teacherLessonStats[teacher.teacher_id] || { count: 0, totalMinutes: 0 };
        const teacherStudents = students?.filter(s => s.teacher_id === teacher.teacher_id) || [];
        const activeTeacherStudents = teacherStudents.filter(s => s.status === 'Active');
        const temporaryStopStudents = teacherStudents.filter(s => s.status === 'Grace').length;
        const leftStudents = teacherStudents.filter(s => s.status === 'Blocked').length;
        const trialLessons = trialStudents?.filter(t => t.teacher_id === teacher.teacher_id).length || 0;

        const totalTeachingHours = stats.totalMinutes / 60;
        const salary = totalTeachingHours * (teacher.rate_per_lesson || 0);

        return {
          teacher_id: teacher.teacher_id,
          name: teacher.name,
          email: teacher.email,
          rate_per_lesson: teacher.rate_per_lesson || 0,
          is_active: teacher.is_active ?? true,
          totalTeachingHours,
          lessonsThisMonth: stats.count,
          salary,
          activeStudents: activeTeacherStudents.length,
          temporaryStopStudents,
          leftStudents,
          trialLessons,
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
