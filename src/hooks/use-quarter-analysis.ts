import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllTeachersTotalHours } from '@/hooks/use-teacher-total-hours';

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
  // Academic year e.g. "2024/2025" starts Sep 2024, ends Jun 2025
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
  // If we're in Sep+ we're in a new academic year
  const latestStart = currentMonth >= 9 ? currentYear : currentYear - 1;
  const years = [];
  for (let y = latestStart; y >= latestStart - 3; y--) {
    years.push({ value: y, label: `${y}/${y + 1}` });
  }
  return years;
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
  teacherDetails: {
    name: string;
    hours: number;
    salary: number;
    activeStudents: number;
    trialsConducted: number;
    trialConversions: number;
    bonus: number;
  }[];
}

export interface QuarterAnalysisData {
  students: QuarterStudentKPIs;
  packages: QuarterPackageKPIs;
  lessons: QuarterLessonKPIs;
  teachers: QuarterTeacherKPIs;
}

export function useQuarterAnalysis(quarter: AcademicQuarter | null) {
  return useQuery({
    queryKey: ['quarter-analysis', quarter?.startDate, quarter?.endDate],
    queryFn: async (): Promise<QuarterAnalysisData> => {
      if (!quarter) throw new Error('No quarter selected');
      const { startDate, endDate } = quarter;

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
        // All students (current snapshot)
        supabase.from('students').select('student_id, status, teacher_id'),
        // Students created in quarter
        supabase.from('students').select('student_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        // Packages created in quarter
        supabase.from('packages').select('package_id, amount, is_renewal, status, payment_status')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        // Scheduled lessons in quarter
        supabase.from('scheduled_lessons').select('scheduled_lesson_id, status, teacher_id, duration_minutes')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate),
        // Trial students in quarter
        supabase.from('trial_students').select('trial_id, status, teacher_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59'),
        // Active teachers
        supabase.from('teachers').select('teacher_id, name, rate_per_lesson, is_active')
          .eq('is_active', true)
          .order('name'),
        // Bonuses for the quarter months
        supabase.from('teacher_bonuses').select('teacher_id, amount, month_year'),
      ]);

      const students = studentsRes.data || [];
      const newStudents = newStudentsRes.data || [];
      const packages = packagesRes.data || [];
      const lessons = lessonsRes.data || [];
      const trials = trialsRes.data || [];
      const teachers = teachersRes.data || [];
      const allBonuses = bonusesRes.data || [];

      // Build month_year strings for this quarter
      const quarterMonthYears: string[] = [];
      const d = new Date(startDate);
      const end = new Date(endDate);
      while (d <= end) {
        quarterMonthYears.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        d.setMonth(d.getMonth() + 1);
      }

      const quarterBonuses = allBonuses.filter(b => quarterMonthYears.includes(b.month_year));

      // STUDENT KPIs
      const activeStudents = students.filter(s => s.status === 'Active').length;
      const temporaryStop = students.filter(s => s.status === 'Temporary Stop').length;
      const leftStudents = students.filter(s => s.status === 'Left').length;
      const totalStudents = students.length;
      const retentionRate = totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0;

      // PACKAGE KPIs
      const newPackages = packages.filter(p => !p.is_renewal).length;
      const renewals = packages.filter(p => p.is_renewal).length;
      const runningPackages = packages.filter(p => p.status === 'Active').length;
      const completedPackages = packages.filter(p => p.status === 'Completed').length;
      const pendingPayments = packages.filter(p => p.payment_status === 'Pending').length;
      const paidRevenue = packages
        .filter(p => p.payment_status === 'Paid')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // LESSON KPIs
      const completedLessons = lessons.filter(l => l.status === 'completed').length;
      const absentLessons = lessons.filter(l => l.status === 'absent').length;
      const scheduledLessons = lessons.filter(l => l.status === 'scheduled').length;
      const trialLessonsCount = trials.length;
      const convertedTrials = trials.filter(t => t.status === 'Converted').length;
      const trialConversionRate = trialLessonsCount > 0 ? (convertedTrials / trialLessonsCount) * 100 : 0;

      // TEACHER KPIs - use batch function
      const teacherIds = teachers.map(t => t.teacher_id);
      const hoursByTeacher = teacherIds.length > 0
        ? await fetchAllTeachersTotalHours(teacherIds, startDate, endDate)
        : {};

      // Count students & trials per teacher
      const studentsByTeacher: Record<string, number> = {};
      const trialsByTeacher: Record<string, { conducted: number; converted: number }> = {};
      students.forEach(s => {
        if (s.teacher_id && s.status === 'Active') {
          studentsByTeacher[s.teacher_id] = (studentsByTeacher[s.teacher_id] || 0) + 1;
        }
      });
      trials.forEach(t => {
        if (t.teacher_id) {
          if (!trialsByTeacher[t.teacher_id]) trialsByTeacher[t.teacher_id] = { conducted: 0, converted: 0 };
          trialsByTeacher[t.teacher_id].conducted++;
          if (t.status === 'Converted') trialsByTeacher[t.teacher_id].converted++;
        }
      });

      // Bonuses per teacher
      const bonusByTeacher: Record<string, number> = {};
      quarterBonuses.forEach(b => {
        bonusByTeacher[b.teacher_id] = (bonusByTeacher[b.teacher_id] || 0) + Number(b.amount);
      });

      let totalTeachingHours = 0;
      let totalSalary = 0;
      let totalLessonsTaught = 0;

      const teacherDetails = teachers.map(t => {
        const hrs = hoursByTeacher[t.teacher_id] || { totalHours: 0, totalLessons: 0, salary: 0 };
        const bonus = bonusByTeacher[t.teacher_id] || 0;
        totalTeachingHours += hrs.totalHours;
        totalSalary += hrs.salary + bonus;
        totalLessonsTaught += hrs.totalLessons;
        const tr = trialsByTeacher[t.teacher_id] || { conducted: 0, converted: 0 };

        return {
          name: t.name,
          hours: hrs.totalHours,
          salary: hrs.salary,
          activeStudents: studentsByTeacher[t.teacher_id] || 0,
          trialsConducted: tr.conducted,
          trialConversions: tr.converted,
          bonus,
        };
      });

      return {
        students: {
          totalStudents,
          activeStudents,
          temporaryStop,
          leftStudents,
          newStudents: newStudents.length,
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
      };
    },
    enabled: !!quarter,
    refetchInterval: 60000,
  });
}
