import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllTeachersTotalHours } from '@/hooks/use-teacher-total-hours';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// Custom academic quarters
// Q1: Sep, Oct, Nov | Q2: Dec, Jan, Feb, Mar | Q3: Apr, May, Jun
// Jul + Aug = excluded

export interface AcademicQuarter {
  label: string;
  months: number[]; // 1-indexed (1=Jan, 9=Sep, etc.)
  startDate: string;
  endDate: string;
}

export function getAcademicYear(year: number): { label: string; quarters: AcademicQuarter[] } {
  return {
    label: `${year}/${year + 1}`,
    quarters: [
      {
        label: 'Quarter 1',
        months: [9, 10, 11],
        startDate: `${year}-09-01`,
        endDate: `${year}-11-30`,
      },
      {
        label: 'Quarter 2',
        months: [12, 1, 2, 3],
        startDate: `${year}-12-01`,
        endDate: `${year + 1}-03-31`,
      },
      {
        label: 'Quarter 3',
        months: [4, 5, 6],
        startDate: `${year + 1}-04-01`,
        endDate: `${year + 1}-06-30`,
      },
    ],
  };
}

export function getAvailableAcademicYears(): { value: number; label: string }[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const latestStart = currentMonth >= 9 ? currentYear : currentYear - 1;
  const years = [];
  for (let y = latestStart; y >= latestStart - 3; y--) {
    years.push({ value: y, label: `${y}/${y + 1}` });
  }
  return years;
}

// Helper to get the correct year for a month within an academic year
function getMonthYear(month: number, academicStartYear: number): number {
  // Q1 months (9,10,11) and Q2 month 12 are in academicStartYear
  // Q2 months (1,2,3) and Q3 months (4,5,6) are in academicStartYear+1
  if (month >= 9) return academicStartYear;
  return academicStartYear + 1;
}

export interface MonthlyStats {
  monthLabel: string; // e.g. "Sep 2025"
  month: number;
  year: number;
  // Students
  newStudents: number;
  // Packages
  totalPackages: number;
  newPackages: number;
  renewals: number;
  paidRevenue: number;
  pendingPayments: number;
  // Lessons
  totalLessons: number;
  completedLessons: number;
  absentLessons: number;
  scheduledLessons: number;
  // Trials
  trialLessons: number;
  trialConversions: number;
  trialConversionRate: number;
}

export interface TeacherQuarterDetail {
  teacherId: string;
  name: string;
  ratePerHour: number;
  // Quarter totals
  totalHours: number;
  salary: number;
  bonus: number;
  activeStudents: number;
  leftStudents: number;
  retentionRate: number;
  trialsConducted: number;
  trialConversions: number;
  trialConversionRate: number;
  // Monthly breakdown
  monthlyData: {
    monthLabel: string;
    hours: number;
    salary: number;
    activeStudents: number;
    leftStudents: number;
    retentionRate: number;
    trialsConducted: number;
    trialConversions: number;
    trialConversionRate: number;
    bonus: number;
  }[];
}

export interface QuarterStudentKPIs {
  totalStudents: number;
  activeStudents: number;
  temporaryStop: number;
  leftStudents: number;
  newStudents: number;
  retentionRate: number;
}

export interface QuarterPackageKPIs {
  totalPackages: number;
  newPackages: number;
  renewals: number;
  runningPackages: number;
  completedPackages: number;
  pendingPayments: number;
  paidRevenue: number;
}

export interface QuarterLessonKPIs {
  totalLessons: number;
  completedLessons: number;
  absentLessons: number;
  scheduledLessons: number;
  trialLessons: number;
  trialConversionRate: number;
}

export interface QuarterTeacherKPIs {
  totalActiveTeachers: number;
  lessonsTaughtThisQuarter: number;
  totalTeachingHours: number;
  totalSalary: number;
  teacherDetails: TeacherQuarterDetail[];
}

export interface QuarterAnalysisData {
  students: QuarterStudentKPIs;
  packages: QuarterPackageKPIs;
  lessons: QuarterLessonKPIs;
  teachers: QuarterTeacherKPIs;
  monthlyBreakdown: MonthlyStats[];
}

export function useQuarterAnalysis(quarter: AcademicQuarter | null, academicStartYear?: number) {
  return useQuery({
    queryKey: ['quarter-analysis', quarter?.startDate, quarter?.endDate],
    queryFn: async (): Promise<QuarterAnalysisData> => {
      if (!quarter) throw new Error('No quarter selected');
      const { startDate, endDate, months } = quarter;
      const startYear = academicStartYear ?? new Date().getFullYear();

      // Build per-month date ranges
      const monthRanges = months.map(m => {
        const yr = getMonthYear(m, startYear);
        const mDate = new Date(yr, m - 1, 1);
        const mStart = format(startOfMonth(mDate), 'yyyy-MM-dd');
        const mEnd = format(endOfMonth(mDate), 'yyyy-MM-dd');
        const label = format(mDate, 'MMM yyyy');
        return { month: m, year: yr, label, start: mStart, end: mEnd, monthYear: `${yr}-${String(m).padStart(2, '0')}` };
      });

      // Parallel fetch all data
      const [
        studentsRes,
        newStudentsRes,
        packagesRes,
        lessonsRes,
        trialsRes,
        teachersRes,
        bonusesRes,
      ] = await Promise.all([
        supabase.from('students').select('student_id, status, teacher_id'),
        supabase.from('students').select('student_id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        supabase.from('packages').select('package_id, amount, is_renewal, status, payment_status, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        supabase.from('scheduled_lessons').select('scheduled_lesson_id, status, teacher_id, duration_minutes, scheduled_date')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate),
        supabase.from('trial_students').select('trial_id, status, teacher_id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        supabase.from('teachers').select('teacher_id, name, rate_per_lesson, is_active')
          .eq('is_active', true)
          .order('name'),
        supabase.from('teacher_bonuses').select('teacher_id, amount, month_year'),
      ]);

      const students = studentsRes.data || [];
      const newStudentsAll = newStudentsRes.data || [];
      const packages = packagesRes.data || [];
      const lessons = lessonsRes.data || [];
      const trials = trialsRes.data || [];
      const teachers = teachersRes.data || [];
      const allBonuses = bonusesRes.data || [];

      const quarterMonthYears = monthRanges.map(m => m.monthYear);
      const quarterBonuses = allBonuses.filter(b => quarterMonthYears.includes(b.month_year));

      // ===== MONTHLY BREAKDOWN =====
      const monthlyBreakdown: MonthlyStats[] = monthRanges.map(mr => {
        const mNewStudents = newStudentsAll.filter(s => {
          const d = new Date(s.created_at!);
          return d.getMonth() + 1 === mr.month && d.getFullYear() === mr.year;
        });
        const mPackages = packages.filter(p => {
          const d = new Date(p.created_at!);
          return d.getMonth() + 1 === mr.month && d.getFullYear() === mr.year;
        });
        const mLessons = lessons.filter(l => {
          const d = new Date(l.scheduled_date);
          return d.getMonth() + 1 === mr.month && d.getFullYear() === mr.year;
        });
        const mTrials = trials.filter(t => {
          const d = new Date(t.created_at!);
          return d.getMonth() + 1 === mr.month && d.getFullYear() === mr.year;
        });
        const mConverted = mTrials.filter(t => t.status === 'Converted').length;

        return {
          monthLabel: mr.label,
          month: mr.month,
          year: mr.year,
          newStudents: mNewStudents.length,
          totalPackages: mPackages.length,
          newPackages: mPackages.filter(p => !p.is_renewal).length,
          renewals: mPackages.filter(p => p.is_renewal).length,
          paidRevenue: mPackages.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + Number(p.amount || 0), 0),
          pendingPayments: mPackages.filter(p => p.payment_status === 'Pending').length,
          totalLessons: mLessons.length,
          completedLessons: mLessons.filter(l => l.status === 'completed').length,
          absentLessons: mLessons.filter(l => l.status === 'absent').length,
          scheduledLessons: mLessons.filter(l => l.status === 'scheduled').length,
          trialLessons: mTrials.length,
          trialConversions: mConverted,
          trialConversionRate: mTrials.length > 0 ? Math.round((mConverted / mTrials.length) * 100) : 0,
        };
      });

      // ===== QUARTER TOTALS =====
      const activeStudents = students.filter(s => s.status === 'Active').length;
      const temporaryStop = students.filter(s => s.status === 'Temporary Stop').length;
      const leftStudents = students.filter(s => s.status === 'Left').length;
      const totalStudents = students.length;
      const retentionRate = (activeStudents + leftStudents) > 0 ? (activeStudents / (activeStudents + leftStudents)) * 100 : 0;

      const newPackages = packages.filter(p => !p.is_renewal).length;
      const renewals = packages.filter(p => p.is_renewal).length;
      const runningPackages = packages.filter(p => p.status === 'Active').length;
      const completedPackages = packages.filter(p => p.status === 'Completed').length;
      const pendingPayments = packages.filter(p => p.payment_status === 'Pending').length;
      const paidRevenue = packages.filter(p => p.payment_status === 'Paid').reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const completedLessons = lessons.filter(l => l.status === 'completed').length;
      const absentLessons = lessons.filter(l => l.status === 'absent').length;
      const scheduledLessons = lessons.filter(l => l.status === 'scheduled').length;
      const trialLessonsCount = trials.length;
      const convertedTrials = trials.filter(t => t.status === 'Converted').length;
      const trialConversionRate = trialLessonsCount > 0 ? (convertedTrials / trialLessonsCount) * 100 : 0;

      // ===== TEACHER KPIs with monthly breakdown =====
      const teacherIds = teachers.map(t => t.teacher_id);

      // Get hours for full quarter
      const hoursByTeacher = teacherIds.length > 0
        ? await fetchAllTeachersTotalHours(teacherIds, startDate, endDate)
        : {};

      // Get hours per month per teacher
      const monthlyHoursByTeacher: Record<string, Record<string, { totalHours: number; salary: number; totalLessons: number }>> = {};
      for (const mr of monthRanges) {
        const monthHours = teacherIds.length > 0
          ? await fetchAllTeachersTotalHours(teacherIds, mr.start, mr.end)
          : {};
        for (const tid of teacherIds) {
          if (!monthlyHoursByTeacher[tid]) monthlyHoursByTeacher[tid] = {};
          const h = monthHours[tid] || { totalHours: 0, salary: 0, totalLessons: 0 };
          monthlyHoursByTeacher[tid][mr.label] = { totalHours: h.totalHours, salary: h.salary, totalLessons: h.totalLessons };
        }
      }

      // Students per teacher (active + left for retention)
      const activeByTeacher: Record<string, number> = {};
      const leftByTeacher: Record<string, number> = {};
      students.forEach(s => {
        if (s.teacher_id) {
          if (s.status === 'Active') activeByTeacher[s.teacher_id] = (activeByTeacher[s.teacher_id] || 0) + 1;
          if (s.status === 'Left') leftByTeacher[s.teacher_id] = (leftByTeacher[s.teacher_id] || 0) + 1;
        }
      });

      // Trials per teacher
      const trialsByTeacher: Record<string, { conducted: number; converted: number }> = {};
      trials.forEach(t => {
        if (t.teacher_id) {
          if (!trialsByTeacher[t.teacher_id]) trialsByTeacher[t.teacher_id] = { conducted: 0, converted: 0 };
          trialsByTeacher[t.teacher_id].conducted++;
          if (t.status === 'Converted') trialsByTeacher[t.teacher_id].converted++;
        }
      });

      // Monthly trials per teacher
      const monthlyTrialsByTeacher: Record<string, Record<string, { conducted: number; converted: number }>> = {};
      trials.forEach(t => {
        if (t.teacher_id && t.created_at) {
          const d = new Date(t.created_at);
          const mLabel = format(d, 'MMM yyyy');
          if (!monthlyTrialsByTeacher[t.teacher_id]) monthlyTrialsByTeacher[t.teacher_id] = {};
          if (!monthlyTrialsByTeacher[t.teacher_id][mLabel]) monthlyTrialsByTeacher[t.teacher_id][mLabel] = { conducted: 0, converted: 0 };
          monthlyTrialsByTeacher[t.teacher_id][mLabel].conducted++;
          if (t.status === 'Converted') monthlyTrialsByTeacher[t.teacher_id][mLabel].converted++;
        }
      });

      // Bonuses per teacher per month
      const bonusByTeacherMonth: Record<string, Record<string, number>> = {};
      const bonusByTeacher: Record<string, number> = {};
      quarterBonuses.forEach(b => {
        bonusByTeacher[b.teacher_id] = (bonusByTeacher[b.teacher_id] || 0) + Number(b.amount);
        // Map month_year to label
        const [y, m] = b.month_year.split('-');
        const mDate = new Date(Number(y), Number(m) - 1, 1);
        const mLabel = format(mDate, 'MMM yyyy');
        if (!bonusByTeacherMonth[b.teacher_id]) bonusByTeacherMonth[b.teacher_id] = {};
        bonusByTeacherMonth[b.teacher_id][mLabel] = (bonusByTeacherMonth[b.teacher_id][mLabel] || 0) + Number(b.amount);
      });

      let totalTeachingHours = 0;
      let totalSalary = 0;
      let totalLessonsTaught = 0;

      const teacherDetails: TeacherQuarterDetail[] = teachers.map(t => {
        const hrs = hoursByTeacher[t.teacher_id] || { totalHours: 0, totalLessons: 0, salary: 0 };
        const bonus = bonusByTeacher[t.teacher_id] || 0;
        totalTeachingHours += hrs.totalHours;
        totalSalary += hrs.salary + bonus;
        totalLessonsTaught += hrs.totalLessons;
        const tr = trialsByTeacher[t.teacher_id] || { conducted: 0, converted: 0 };
        const tActive = activeByTeacher[t.teacher_id] || 0;
        const tLeft = leftByTeacher[t.teacher_id] || 0;
        const tRetention = (tActive + tLeft) > 0 ? (tActive / (tActive + tLeft)) * 100 : 100;
        const tConvRate = tr.conducted > 0 ? (tr.converted / tr.conducted) * 100 : 0;

        // Monthly data
        const monthlyData = monthRanges.map(mr => {
          const mh = monthlyHoursByTeacher[t.teacher_id]?.[mr.label] || { totalHours: 0, salary: 0 };
          const mt = monthlyTrialsByTeacher[t.teacher_id]?.[mr.label] || { conducted: 0, converted: 0 };
          const mb = bonusByTeacherMonth[t.teacher_id]?.[mr.label] || 0;
          return {
            monthLabel: mr.label,
            hours: mh.totalHours,
            salary: mh.salary,
            activeStudents: tActive, // snapshot (same for all months)
            leftStudents: tLeft,
            retentionRate: Math.round(tRetention * 10) / 10,
            trialsConducted: mt.conducted,
            trialConversions: mt.converted,
            trialConversionRate: mt.conducted > 0 ? Math.round((mt.converted / mt.conducted) * 100) : 0,
            bonus: mb,
          };
        });

        return {
          teacherId: t.teacher_id,
          name: t.name,
          ratePerHour: t.rate_per_lesson || 0,
          totalHours: hrs.totalHours,
          salary: hrs.salary,
          bonus,
          activeStudents: tActive,
          leftStudents: tLeft,
          retentionRate: Math.round(tRetention * 10) / 10,
          trialsConducted: tr.conducted,
          trialConversions: tr.converted,
          trialConversionRate: Math.round(tConvRate * 10) / 10,
          monthlyData,
        };
      });

      return {
        students: {
          totalStudents,
          activeStudents,
          temporaryStop,
          leftStudents,
          newStudents: newStudentsAll.length,
          retentionRate: Math.round(retentionRate * 10) / 10,
        },
        packages: {
          totalPackages: packages.length,
          newPackages,
          renewals,
          runningPackages,
          completedPackages,
          pendingPayments,
          paidRevenue,
        },
        lessons: {
          totalLessons: lessons.length,
          completedLessons,
          absentLessons,
          scheduledLessons,
          trialLessons: trialLessonsCount,
          trialConversionRate: Math.round(trialConversionRate * 10) / 10,
        },
        teachers: {
          totalActiveTeachers: teachers.length,
          lessonsTaughtThisQuarter: totalLessonsTaught,
          totalTeachingHours: Math.round(totalTeachingHours * 100) / 100,
          totalSalary: Math.round(totalSalary * 100) / 100,
          teacherDetails,
        },
        monthlyBreakdown,
      };
    },
    enabled: !!quarter,
    refetchInterval: 60000,
  });
}
