import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { isHistoricalMonth, getHistoricalDataForMonth, type HistoricalTeacherMonth } from '@/lib/historical-quarter-data';

// Custom academic quarters
// Q1: Sep, Oct, Nov | Q2: Dec, Jan, Feb, Mar | Q3: Apr, May, Jun

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
      { label: 'Quarter 1', months: [9, 10, 11], startDate: `${year}-09-01`, endDate: `${year}-11-30` },
      { label: 'Quarter 2', months: [12, 1, 2, 3], startDate: `${year}-12-01`, endDate: `${year + 1}-03-31` },
      { label: 'Quarter 3', months: [4, 5, 6], startDate: `${year + 1}-04-01`, endDate: `${year + 1}-06-30` },
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

function getMonthYear(month: number, academicStartYear: number): number {
  if (month >= 9) return academicStartYear;
  return academicStartYear + 1;
}

function parseSourceDate(dateStr: string) {
  return parseISO(dateStr);
}

function getSourceMonthLabel(dateStr: string) {
  return format(parseSourceDate(dateStr), 'MMM yyyy');
}

function isSameSourceMonth(dateStr: string, month: number, year: number) {
  const date = parseSourceDate(dateStr);
  return date.getMonth() + 1 === month && date.getFullYear() === year;
}

export interface MonthlyStats {
  monthLabel: string;
  month: number;
  year: number;
  newStudents: number;
  totalPackages: number;
  newPackages: number;
  renewals: number;
  paidRevenue: number;
  pendingPayments: number;
  totalLessons: number;
  completedLessons: number;
  absentLessons: number;
  scheduledLessons: number;
  trialLessons: number;
  trialConversions: number;
  trialConversionRate: number;
}

export interface TeacherQuarterDetail {
  teacherId: string;
  name: string;
  ratePerHour: number;
  totalHours: number;
  salary: number;
  bonus: number;
  activeStudents: number;
  stoppedStudents: number;
  leftStudents: number;
  retentionRate: number;
  trialsConducted: number;
  trialConversions: number;
  trialConversionRate: number;
  monthlyData: {
    monthLabel: string;
    hours: number;
    salary: number;
    activeStudents: number;
    stoppedStudents: number;
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

export interface TeacherBonusRule {
  name: string;
  actual: number;
  target: number;
  suffix: string;
  achieved: boolean;
  amount: number;
}

export interface TeacherQuarterlyBonus {
  teacherId: string;
  teacherName: string;
  rules: TeacherBonusRule[];
  totalBonus: number;
  monthlyHours: { month: string; hours: number; met: boolean }[];
}

export interface QuarterAnalysisData {
  students: QuarterStudentKPIs;
  packages: QuarterPackageKPIs;
  lessons: QuarterLessonKPIs;
  teachers: QuarterTeacherKPIs;
  monthlyBreakdown: MonthlyStats[];
  quarterlyBonuses: TeacherQuarterlyBonus[];
}

export function useQuarterAnalysis(quarter: AcademicQuarter | null, academicStartYear?: number) {
  return useQuery({
    queryKey: ['quarter-analysis', quarter?.startDate, quarter?.endDate],
    queryFn: async (): Promise<QuarterAnalysisData> => {
      if (!quarter) throw new Error('No quarter selected');
      const { startDate, endDate, months } = quarter;
      const startYear = academicStartYear ?? new Date().getFullYear();

      const monthRanges = months.map(m => {
        const yr = getMonthYear(m, startYear);
        const mDate = new Date(yr, m - 1, 1);
        const mStart = format(startOfMonth(mDate), 'yyyy-MM-dd');
        const mEnd = format(endOfMonth(mDate), 'yyyy-MM-dd');
        const label = format(mDate, 'MMM yyyy');
        return { month: m, year: yr, label, start: mStart, end: mEnd, monthYear: `${yr}-${String(m).padStart(2, '0')}`, isHistorical: isHistoricalMonth(label) };
      });

      const allHistorical = monthRanges.every(m => m.isHistorical);
      const hasHistorical = monthRanges.some(m => m.isHistorical);

      // ===== Build historical teacher data for historical months =====
      const historicalByMonth: Record<string, HistoricalTeacherMonth[]> = {};
      if (hasHistorical) {
        monthRanges.filter(m => m.isHistorical).forEach(mr => {
          historicalByMonth[mr.label] = getHistoricalDataForMonth(mr.label);
        });
      }

      // If fully historical, build result entirely from static data
      if (allHistorical) {
        return buildFullyHistoricalResult(monthRanges, historicalByMonth);
      }

      // ===== SINGLE parallel fetch for ALL data (live months) =====
      const [
        studentsRes, newStudentsRes, packagesRes, lessonsRes,
        trialsRes, teachersRes, bonusesRes, trialLessonsLogRes,
      ] = await Promise.all([
        supabase.from('students').select('student_id, status, teacher_id, created_at')
          .lte('created_at', endDate + 'T23:59:59'),
        supabase.from('students').select('student_id, created_at')
          .gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
        supabase.from('packages').select('package_id, amount, is_renewal, status, payment_status, created_at')
          .gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
        supabase.from('scheduled_lessons').select('scheduled_lesson_id, status, teacher_id, duration_minutes, scheduled_date, student_id')
          .gte('scheduled_date', startDate).lte('scheduled_date', endDate),
        supabase.from('trial_students').select('trial_id, status, conversion_status, teacher_id, created_at')
          .gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
        supabase.from('teachers').select('teacher_id, name, rate_per_lesson, is_active')
          .eq('is_active', true).order('name'),
        supabase.from('teacher_bonuses').select('teacher_id, amount, month_year'),
        supabase.from('trial_lessons_log').select('teacher_id, lesson_date')
          .eq('status', 'completed')
          .gte('lesson_date', startDate).lte('lesson_date', endDate),
      ]);

      const allStudentsInQuarter = studentsRes.data || [];
      const newStudentsAll = newStudentsRes.data || [];
      const packages = packagesRes.data || [];
      const lessons = lessonsRes.data || [];
      const trials = trialsRes.data || [];
      const teachers = teachersRes.data || [];
      const allBonuses = bonusesRes.data || [];
      const trialLessonsLog = trialLessonsLogRes.data || [];

      const studentIdsWithLessons = new Set(lessons.map(l => l.student_id).filter(Boolean));
      const students = allStudentsInQuarter.filter(s =>
        studentIdsWithLessons.has(s.student_id) ||
        (s.created_at && s.created_at >= startDate && s.created_at <= endDate + 'T23:59:59')
      );

      const quarterMonthYears = monthRanges.map(m => m.monthYear);
      const quarterBonuses = allBonuses.filter(b => quarterMonthYears.includes(b.month_year));

      // ===== MONTHLY BREAKDOWN =====
      const monthlyBreakdown: MonthlyStats[] = monthRanges.map(mr => {
        // For historical months, aggregate from static data
        if (mr.isHistorical) {
          const hData = historicalByMonth[mr.label] || [];
          const totalTrials = hData.reduce((s, d) => s + d.trialsConducted, 0);
          const totalConversions = hData.reduce((s, d) => s + d.trialConversions, 0);
          return {
            monthLabel: mr.label, month: mr.month, year: mr.year,
            newStudents: 0, totalPackages: 0, newPackages: 0, renewals: 0,
            paidRevenue: hData.reduce((s, d) => s + d.salary, 0),
            pendingPayments: 0,
            totalLessons: 0, completedLessons: 0, absentLessons: 0, scheduledLessons: 0,
            trialLessons: totalTrials,
            trialConversions: totalConversions,
            trialConversionRate: totalTrials > 0 ? Math.round((totalConversions / totalTrials) * 100) : 0,
          };
        }

        const matchMonth = (dateStr: string) => isSameSourceMonth(dateStr, mr.month, mr.year);
        const mNewStudents = newStudentsAll.filter(s => matchMonth(s.created_at!));
        const mPackages = packages.filter(p => matchMonth(p.created_at!));
        const mLessons = lessons.filter(l => matchMonth(l.scheduled_date));
        const mTrials = trials.filter(t => matchMonth(t.created_at!));
        const mConverted = mTrials.filter(t => t.conversion_status === 'Converted').length;

        return {
          monthLabel: mr.label, month: mr.month, year: mr.year,
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

      // ===== QUARTER TOTALS (students section — from live data only) =====
      const activeStudents = students.filter(s => s.status === 'Active').length;
      const temporaryStop = students.filter(s => s.status === 'Temporary Stop').length;
      const leftStudents = students.filter(s => s.status === 'Left').length;
      const totalStudents = students.length;

      // If mixed quarter, augment student totals from historical data
      let hActiveTotal = 0, hStopTotal = 0, hLeftTotal = 0;
      if (hasHistorical) {
        // Use the latest historical month's student snapshot
        const lastHistMonth = monthRanges.filter(m => m.isHistorical).pop();
        if (lastHistMonth) {
          const hData = historicalByMonth[lastHistMonth.label] || [];
          hActiveTotal = hData.reduce((s, d) => s + d.activeStudents, 0);
          hStopTotal = hData.reduce((s, d) => s + d.stoppedStudents, 0);
          hLeftTotal = hData.reduce((s, d) => s + d.leftStudents, 0);
        }
      }

      const combinedActive = activeStudents + hActiveTotal;
      const combinedStop = temporaryStop + hStopTotal;
      const combinedLeft = leftStudents + hLeftTotal;
      const combinedTotal = combinedActive + combinedStop + combinedLeft;
      const retentionDenominator = combinedActive + combinedStop + combinedLeft;
      const retentionRate = retentionDenominator > 0 ? (combinedActive / retentionDenominator) * 100 : 0;

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
      const convertedTrials = trials.filter(t => t.conversion_status === 'Converted').length;
      const trialConversionRate = trialLessonsCount > 0 ? (convertedTrials / trialLessonsCount) * 100 : 0;

      // ===== TEACHER KPIs — computed from already-fetched data + historical =====
      const teacherIds = teachers.map(t => t.teacher_id);
      const rates: Record<string, number> = {};
      const teacherNameToId: Record<string, string> = {};
      teachers.forEach(t => {
        rates[t.teacher_id] = t.rate_per_lesson || 0;
        teacherNameToId[t.name] = t.teacher_id;
      });

      type TeacherMonthAgg = { regularMinutes: number; regularCount: number; trialCount: number };
      const teacherMonthStats: Record<string, Record<string, TeacherMonthAgg>> = {};
      const teacherQuarterStats: Record<string, TeacherMonthAgg> = {};

      teacherIds.forEach(id => {
        teacherQuarterStats[id] = { regularMinutes: 0, regularCount: 0, trialCount: 0 };
        teacherMonthStats[id] = {};
        monthRanges.forEach(mr => {
          teacherMonthStats[id][mr.label] = { regularMinutes: 0, regularCount: 0, trialCount: 0 };
        });
      });

      // Aggregate regular lessons (live data only)
      lessons.filter(l => l.status === 'completed' && l.teacher_id).forEach(l => {
        const tid = l.teacher_id!;
        if (!teacherQuarterStats[tid]) return;
        const mins = l.duration_minutes || 0;
        teacherQuarterStats[tid].regularMinutes += mins;
        teacherQuarterStats[tid].regularCount += 1;
        const mLabel = getSourceMonthLabel(l.scheduled_date);
        if (teacherMonthStats[tid]?.[mLabel]) {
          teacherMonthStats[tid][mLabel].regularMinutes += mins;
          teacherMonthStats[tid][mLabel].regularCount += 1;
        }
      });

      // Aggregate trial lessons (live data only)
      trialLessonsLog.forEach(t => {
        const tid = t.teacher_id;
        if (!tid || !teacherQuarterStats[tid]) return;
        teacherQuarterStats[tid].trialCount += 1;
        const mLabel = getSourceMonthLabel(t.lesson_date);
        if (teacherMonthStats[tid]?.[mLabel]) {
          teacherMonthStats[tid][mLabel].trialCount += 1;
        }
      });

      // Students per teacher (live data) — current snapshot
      const activeByTeacher: Record<string, number> = {};
      const leftByTeacher: Record<string, number> = {};
      const stopByTeacher: Record<string, number> = {};
      students.forEach(s => {
        if (s.teacher_id) {
          if (s.status === 'Active') activeByTeacher[s.teacher_id] = (activeByTeacher[s.teacher_id] || 0) + 1;
          if (s.status === 'Left') leftByTeacher[s.teacher_id] = (leftByTeacher[s.teacher_id] || 0) + 1;
          if (s.status === 'Temporary Stop') stopByTeacher[s.teacher_id] = (stopByTeacher[s.teacher_id] || 0) + 1;
        }
      });

      // Build per-teacher per-month student sets (lesson-based scoping)
      const studentStatusMap: Record<string, string> = {};
      students.forEach(s => { studentStatusMap[s.student_id] = s.status || 'Active'; });

      const teacherMonthStudents: Record<string, Record<string, Set<string>>> = {};
      teacherIds.forEach(id => {
        teacherMonthStudents[id] = {};
        monthRanges.forEach(mr => { teacherMonthStudents[id][mr.label] = new Set(); });
      });
      lessons.forEach(l => {
        if (!l.teacher_id || !l.student_id) return;
        const mLabel = getSourceMonthLabel(l.scheduled_date);
        if (teacherMonthStudents[l.teacher_id]?.[mLabel]) {
          teacherMonthStudents[l.teacher_id][mLabel].add(l.student_id);
        }
      });

      // Trials per teacher (live data)
      const trialsByTeacher: Record<string, { conducted: number; converted: number }> = {};
      const monthlyTrialsByTeacher: Record<string, Record<string, { conducted: number; converted: number }>> = {};
      trials.forEach(t => {
        if (t.teacher_id) {
          if (!trialsByTeacher[t.teacher_id]) trialsByTeacher[t.teacher_id] = { conducted: 0, converted: 0 };
          trialsByTeacher[t.teacher_id].conducted++;
          if (t.conversion_status === 'Converted') trialsByTeacher[t.teacher_id].converted++;
          if (t.created_at) {
              const mLabel = getSourceMonthLabel(t.created_at);
            if (!monthlyTrialsByTeacher[t.teacher_id]) monthlyTrialsByTeacher[t.teacher_id] = {};
            if (!monthlyTrialsByTeacher[t.teacher_id][mLabel]) monthlyTrialsByTeacher[t.teacher_id][mLabel] = { conducted: 0, converted: 0 };
            monthlyTrialsByTeacher[t.teacher_id][mLabel].conducted++;
            if (t.conversion_status === 'Converted') monthlyTrialsByTeacher[t.teacher_id][mLabel].converted++;
          }
        }
      });

      // Bonuses (live data)
      const bonusByTeacherMonth: Record<string, Record<string, number>> = {};
      const bonusByTeacher: Record<string, number> = {};
      quarterBonuses.forEach(b => {
        bonusByTeacher[b.teacher_id] = (bonusByTeacher[b.teacher_id] || 0) + Number(b.amount);
        const [y, m] = b.month_year.split('-');
        const mLabel = format(new Date(Number(y), Number(m) - 1, 1), 'MMM yyyy');
        if (!bonusByTeacherMonth[b.teacher_id]) bonusByTeacherMonth[b.teacher_id] = {};
        bonusByTeacherMonth[b.teacher_id][mLabel] = (bonusByTeacherMonth[b.teacher_id][mLabel] || 0) + Number(b.amount);
      });

      let totalTeachingHours = 0;
      let totalSalary = 0;
      let totalLessonsTaught = 0;

      const calcHoursAndSalary = (agg: TeacherMonthAgg, rate: number) => {
        const regularHours = agg.regularMinutes / 60;
        const trialHours = agg.trialCount * 0.5;
        const totalHours = regularHours + trialHours;
        return { totalHours, salary: Math.round(totalHours * rate * 100) / 100, totalLessons: agg.regularCount + agg.trialCount };
      };

      // Build teacher details, merging historical months
      const teacherDetails: TeacherQuarterDetail[] = teachers.map(t => {
        const rate = rates[t.teacher_id] || 0;

        // Build monthly data, substituting historical months
        const monthlyData = monthRanges.map(mr => {
          if (mr.isHistorical) {
            const hRecords = historicalByMonth[mr.label] || [];
            const hMatch = hRecords.find(h => h.teacherName === t.name);
            if (hMatch) {
              return {
                monthLabel: mr.label,
                hours: hMatch.totalHours,
                salary: hMatch.salary,
                activeStudents: hMatch.activeStudents,
                stoppedStudents: hMatch.stoppedStudents,
                leftStudents: hMatch.leftStudents,
                retentionRate: hMatch.retentionRate,
                trialsConducted: hMatch.trialsConducted,
                trialConversions: hMatch.trialConversions,
                trialConversionRate: hMatch.trialConversionRate,
                bonus: hMatch.bonus,
              };
            }
            // Teacher not in historical data for this month
            return { monthLabel: mr.label, hours: 0, salary: 0, activeStudents: 0, stoppedStudents: 0, leftStudents: 0, retentionRate: 0, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 };
          }

          // Live month — lesson-based student scoping
          const mAgg = teacherMonthStats[t.teacher_id]?.[mr.label] || { regularMinutes: 0, regularCount: 0, trialCount: 0 };
          const mCalc = calcHoursAndSalary(mAgg, rate);
          const mt = monthlyTrialsByTeacher[t.teacher_id]?.[mr.label] || { conducted: 0, converted: 0 };
          const mb = bonusByTeacherMonth[t.teacher_id]?.[mr.label] || 0;

          // Get students who had a lesson with this teacher this month
          const monthStudentIds = teacherMonthStudents[t.teacher_id]?.[mr.label] || new Set<string>();
          let mActive = 0, mStopped = 0, mLeft = 0;
          monthStudentIds.forEach(sid => {
            const status = studentStatusMap[sid];
            if (status === 'Active') mActive++;
            else if (status === 'Temporary Stop') mStopped++;
            else if (status === 'Left') mLeft++;
          });
          const mTotal = mActive + mStopped + mLeft;
          const mRetention = mTotal > 0 ? (mActive / mTotal) * 100 : 100;

          return {
            monthLabel: mr.label,
            hours: mCalc.totalHours,
            salary: mCalc.salary,
            activeStudents: mActive,
            stoppedStudents: mStopped,
            leftStudents: mLeft,
            retentionRate: Math.round(mRetention * 10) / 10,
            trialsConducted: mt.conducted,
            trialConversions: mt.converted,
            trialConversionRate: mt.conducted > 0 ? Math.round((mt.converted / mt.conducted) * 100) : 0,
            bonus: mb,
          };
        });

        // Quarter totals from monthly data (combines historical + live)
        const qHours = monthlyData.reduce((s, m) => s + m.hours, 0);
        const qSalary = monthlyData.reduce((s, m) => s + m.salary, 0);
        const qBonus = monthlyData.reduce((s, m) => s + m.bonus, 0);
        const qTrials = monthlyData.reduce((s, m) => s + m.trialsConducted, 0);
        const qConversions = monthlyData.reduce((s, m) => s + m.trialConversions, 0);

        // Use latest month's student data for the quarter view
        const latestMonth = monthlyData.filter(m => m.activeStudents > 0 || m.leftStudents > 0 || m.stoppedStudents > 0).pop() || monthlyData[monthlyData.length - 1];
        const qActive = latestMonth.activeStudents;
        const qStopped = latestMonth.stoppedStudents;
        const qLeft = latestMonth.leftStudents;
        const qTotal = qActive + qStopped + qLeft;
        const qRetention = qTotal > 0 ? (qActive / qTotal) * 100 : 100;

        totalTeachingHours += qHours;
        totalSalary += qSalary + qBonus;
        totalLessonsTaught += monthlyData.reduce((s, m) => s + Math.round(m.hours * 2), 0); // approximate lesson count from hours

        return {
          teacherId: t.teacher_id, name: t.name, ratePerHour: rate,
          totalHours: qHours, salary: qSalary, bonus: qBonus,
          activeStudents: qActive, stoppedStudents: qStopped, leftStudents: qLeft,
          retentionRate: Math.round(qRetention * 10) / 10,
          trialsConducted: qTrials, trialConversions: qConversions,
          trialConversionRate: qTrials > 0 ? Math.round((qConversions / qTrials) * 100 * 10) / 10 : 0,
          monthlyData,
        };
      });

      // Also include historical-only teachers not in the live DB
      if (hasHistorical) {
        const allHistTeachers = new Set<string>();
        Object.values(historicalByMonth).forEach(records => records.forEach(r => allHistTeachers.add(r.teacherName)));
        const liveTeacherNames = new Set(teachers.map(t => t.name));
        const histOnlyNames = [...allHistTeachers].filter(n => !liveTeacherNames.has(n));

        histOnlyNames.forEach(name => {
          const monthlyData = monthRanges.map(mr => {
            if (mr.isHistorical) {
              const hMatch = (historicalByMonth[mr.label] || []).find(h => h.teacherName === name);
              if (hMatch) return { monthLabel: mr.label, hours: hMatch.totalHours, salary: hMatch.salary, activeStudents: hMatch.activeStudents, stoppedStudents: hMatch.stoppedStudents, leftStudents: hMatch.leftStudents, retentionRate: hMatch.retentionRate, trialsConducted: hMatch.trialsConducted, trialConversions: hMatch.trialConversions, trialConversionRate: hMatch.trialConversionRate, bonus: hMatch.bonus };
            }
            return { monthLabel: mr.label, hours: 0, salary: 0, activeStudents: 0, stoppedStudents: 0, leftStudents: 0, retentionRate: 0, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 };
          });

          const qHours = monthlyData.reduce((s, m) => s + m.hours, 0);
          const qSalary = monthlyData.reduce((s, m) => s + m.salary, 0);
          const qBonus = monthlyData.reduce((s, m) => s + m.bonus, 0);
          const qTrials = monthlyData.reduce((s, m) => s + m.trialsConducted, 0);
          const qConversions = monthlyData.reduce((s, m) => s + m.trialConversions, 0);
          const latestMonth = monthlyData.filter(m => m.activeStudents > 0).pop() || monthlyData[monthlyData.length - 1];
          const qLeft = monthlyData.reduce((s, m) => s + m.leftStudents, 0);
          const qActive = latestMonth.activeStudents;
          const qTotal = qActive + qLeft;

          totalTeachingHours += qHours;
          totalSalary += qSalary + qBonus;

          teacherDetails.push({
            teacherId: `hist-${name}`, name, ratePerHour: (historicalByMonth[Object.keys(historicalByMonth)[0]] || []).find(h => h.teacherName === name)?.hourRate || 0,
            totalHours: qHours, salary: qSalary, bonus: qBonus,
            activeStudents: qActive, stoppedStudents: 0, leftStudents: qLeft,
            retentionRate: qTotal > 0 ? Math.round((qActive / qTotal) * 100 * 10) / 10 : 0,
            trialsConducted: qTrials, trialConversions: qConversions,
            trialConversionRate: qTrials > 0 ? Math.round((qConversions / qTrials) * 100 * 10) / 10 : 0,
            monthlyData,
          });
        });
      }

      // ===== QUARTERLY BONUS CALCULATION =====
      const BONUS_AMOUNT = 750;
      const HOURS_TARGET = 60;
      const RETENTION_TARGET = 75;
      const TRIAL_COUNT_TARGET = 10;
      const TRIAL_SUCCESS_TARGET = 70;

      const quarterlyBonuses: TeacherQuarterlyBonus[] = teacherDetails.map(t => {
        const monthlyHours = t.monthlyData.map(m => ({
          month: m.monthLabel,
          hours: Math.round(m.hours * 10) / 10,
          met: m.hours >= HOURS_TARGET,
        }));
        const allMonthsMet = monthlyHours.every(m => m.met);
        const avgHours = t.monthlyData.length > 0 ? t.monthlyData.reduce((s, m) => s + m.hours, 0) / t.monthlyData.length : 0;

        const hoursRule: TeacherBonusRule = { name: 'Teaching Hours', actual: Math.round(avgHours * 10) / 10, target: HOURS_TARGET, suffix: 'hrs/mo', achieved: allMonthsMet, amount: allMonthsMet ? BONUS_AMOUNT : 0 };
        const retentionAchieved = allMonthsMet && t.retentionRate >= RETENTION_TARGET;
        const retentionRule: TeacherBonusRule = { name: 'Retention Rate', actual: t.retentionRate, target: RETENTION_TARGET, suffix: '%', achieved: retentionAchieved, amount: retentionAchieved ? BONUS_AMOUNT : 0 };
        const trialSuccessRate = t.trialsConducted > 0 ? Math.round((t.trialConversions / t.trialsConducted) * 1000) / 10 : 0;
        const trialAchieved = t.trialsConducted >= TRIAL_COUNT_TARGET && trialSuccessRate >= TRIAL_SUCCESS_TARGET;
        const trialRule: TeacherBonusRule = { name: 'Trial Lesson Success', actual: trialSuccessRate, target: TRIAL_SUCCESS_TARGET, suffix: `% (${t.trialsConducted}/${TRIAL_COUNT_TARGET} trials)`, achieved: trialAchieved, amount: trialAchieved ? BONUS_AMOUNT : 0 };

        const rules = [hoursRule, retentionRule, trialRule];
        return { teacherId: t.teacherId, teacherName: t.name, rules, totalBonus: rules.reduce((s, r) => s + r.amount, 0), monthlyHours };
      });

      return {
        students: {
          totalStudents: combinedTotal, activeStudents: combinedActive, temporaryStop: combinedStop, leftStudents: combinedLeft,
          newStudents: newStudentsAll.length,
          retentionRate: Math.round(retentionRate * 10) / 10,
        },
        packages: { totalPackages: packages.length, newPackages, renewals, runningPackages, completedPackages, pendingPayments, paidRevenue },
        lessons: {
          totalLessons: lessons.length, completedLessons, absentLessons, scheduledLessons,
          trialLessons: trialLessonsCount,
          trialConversionRate: Math.round(trialConversionRate * 10) / 10,
        },
        teachers: {
          totalActiveTeachers: teacherDetails.length,
          lessonsTaughtThisQuarter: totalLessonsTaught,
          totalTeachingHours: Math.round(totalTeachingHours * 100) / 100,
          totalSalary: Math.round(totalSalary * 100) / 100,
          teacherDetails,
        },
        monthlyBreakdown,
        quarterlyBonuses,
      };
    },
    enabled: !!quarter,
    refetchInterval: 60000,
  });
}

// ===== Helper: Build fully historical quarter from static data =====
function buildFullyHistoricalResult(
  monthRanges: { month: number; year: number; label: string; isHistorical: boolean }[],
  historicalByMonth: Record<string, HistoricalTeacherMonth[]>,
): QuarterAnalysisData {
  // Collect all unique teacher names
  const allTeachers = new Set<string>();
  Object.values(historicalByMonth).forEach(records => records.forEach(r => allTeachers.add(r.teacherName)));
  const teacherNames = [...allTeachers];

  const BONUS_AMOUNT = 750;
  const HOURS_TARGET = 60;
  const RETENTION_TARGET = 75;
  const TRIAL_COUNT_TARGET = 10;
  const TRIAL_SUCCESS_TARGET = 70;

  // Monthly breakdown
  const monthlyBreakdown: MonthlyStats[] = monthRanges.map(mr => {
    const hData = historicalByMonth[mr.label] || [];
    const totalTrials = hData.reduce((s, d) => s + d.trialsConducted, 0);
    const totalConversions = hData.reduce((s, d) => s + d.trialConversions, 0);
    return {
      monthLabel: mr.label, month: mr.month, year: mr.year,
      newStudents: 0, totalPackages: 0, newPackages: 0, renewals: 0,
      paidRevenue: hData.reduce((s, d) => s + d.salary, 0),
      pendingPayments: 0,
      totalLessons: 0, completedLessons: 0, absentLessons: 0, scheduledLessons: 0,
      trialLessons: totalTrials, trialConversions: totalConversions,
      trialConversionRate: totalTrials > 0 ? Math.round((totalConversions / totalTrials) * 100) : 0,
    };
  });

  let totalTeachingHours = 0;
  let totalSalary = 0;

  const teacherDetails: TeacherQuarterDetail[] = teacherNames.map(name => {
    const monthlyData = monthRanges.map(mr => {
      const hMatch = (historicalByMonth[mr.label] || []).find(h => h.teacherName === name);
      if (hMatch) return { monthLabel: mr.label, hours: hMatch.totalHours, salary: hMatch.salary, activeStudents: hMatch.activeStudents, stoppedStudents: hMatch.stoppedStudents, leftStudents: hMatch.leftStudents, retentionRate: hMatch.retentionRate, trialsConducted: hMatch.trialsConducted, trialConversions: hMatch.trialConversions, trialConversionRate: hMatch.trialConversionRate, bonus: hMatch.bonus };
      return { monthLabel: mr.label, hours: 0, salary: 0, activeStudents: 0, stoppedStudents: 0, leftStudents: 0, retentionRate: 0, trialsConducted: 0, trialConversions: 0, trialConversionRate: 0, bonus: 0 };
    });

    const qHours = monthlyData.reduce((s, m) => s + m.hours, 0);
    const qSalary = monthlyData.reduce((s, m) => s + m.salary, 0);
    const qBonus = monthlyData.reduce((s, m) => s + m.bonus, 0);
    const qTrials = monthlyData.reduce((s, m) => s + m.trialsConducted, 0);
    const qConversions = monthlyData.reduce((s, m) => s + m.trialConversions, 0);
    const latestMonth = monthlyData.filter(m => m.activeStudents > 0).pop() || monthlyData[monthlyData.length - 1];
    const qActive = latestMonth.activeStudents;
    const qLeft = monthlyData.reduce((s, m) => s + m.leftStudents, 0);
    const latestHistMatch = (historicalByMonth[monthRanges[monthRanges.length - 1].label] || []).find(h => h.teacherName === name);
    const qStopped = latestHistMatch?.stoppedStudents || 0;
    const qTotal = qActive + qStopped + qLeft;
    const rate = (Object.values(historicalByMonth).flat().find(h => h.teacherName === name))?.hourRate || 0;

    totalTeachingHours += qHours;
    totalSalary += qSalary + qBonus;

    return {
      teacherId: `hist-${name}`, name, ratePerHour: rate,
      totalHours: qHours, salary: qSalary, bonus: qBonus,
      activeStudents: qActive, stoppedStudents: qStopped, leftStudents: qLeft,
      retentionRate: qTotal > 0 ? Math.round((qActive / qTotal) * 100 * 10) / 10 : 0,
      trialsConducted: qTrials, trialConversions: qConversions,
      trialConversionRate: qTrials > 0 ? Math.round((qConversions / qTrials) * 100 * 10) / 10 : 0,
      monthlyData,
    };
  });

  // Student totals from latest month
  const lastMonth = monthRanges[monthRanges.length - 1];
  const lastData = historicalByMonth[lastMonth.label] || [];
  const totalActive = lastData.reduce((s, d) => s + d.activeStudents, 0);
  const totalStopped = lastData.reduce((s, d) => s + d.stoppedStudents, 0);
  const totalLeft = teacherDetails.reduce((s, t) => s + t.leftStudents, 0);
  const totalStudents = totalActive + totalStopped + totalLeft;
  const totalTrialsQ = teacherDetails.reduce((s, t) => s + t.trialsConducted, 0);
  const totalConvQ = teacherDetails.reduce((s, t) => s + t.trialConversions, 0);

  const quarterlyBonuses: TeacherQuarterlyBonus[] = teacherDetails.map(t => {
    const monthlyHours = t.monthlyData.map(m => ({ month: m.monthLabel, hours: Math.round(m.hours * 10) / 10, met: m.hours >= HOURS_TARGET }));
    const allMonthsMet = monthlyHours.every(m => m.met);
    const avgHours = t.monthlyData.length > 0 ? t.monthlyData.reduce((s, m) => s + m.hours, 0) / t.monthlyData.length : 0;

    const hoursRule: TeacherBonusRule = { name: 'Teaching Hours', actual: Math.round(avgHours * 10) / 10, target: HOURS_TARGET, suffix: 'hrs/mo', achieved: allMonthsMet, amount: allMonthsMet ? BONUS_AMOUNT : 0 };
    const retentionAchieved = allMonthsMet && t.retentionRate >= RETENTION_TARGET;
    const retentionRule: TeacherBonusRule = { name: 'Retention Rate', actual: t.retentionRate, target: RETENTION_TARGET, suffix: '%', achieved: retentionAchieved, amount: retentionAchieved ? BONUS_AMOUNT : 0 };
    const trialSuccessRate = t.trialsConducted > 0 ? Math.round((t.trialConversions / t.trialsConducted) * 1000) / 10 : 0;
    const trialAchieved = t.trialsConducted >= TRIAL_COUNT_TARGET && trialSuccessRate >= TRIAL_SUCCESS_TARGET;
    const trialRule: TeacherBonusRule = { name: 'Trial Lesson Success', actual: trialSuccessRate, target: TRIAL_SUCCESS_TARGET, suffix: `% (${t.trialsConducted}/${TRIAL_COUNT_TARGET} trials)`, achieved: trialAchieved, amount: trialAchieved ? BONUS_AMOUNT : 0 };

    const rules = [hoursRule, retentionRule, trialRule];
    return { teacherId: t.teacherId, teacherName: t.name, rules, totalBonus: rules.reduce((s, r) => s + r.amount, 0), monthlyHours };
  });

  return {
    students: {
      totalStudents, activeStudents: totalActive, temporaryStop: totalStopped, leftStudents: totalLeft,
      newStudents: 0,
      retentionRate: totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100 * 10) / 10 : 0,
    },
    packages: { totalPackages: 0, newPackages: 0, renewals: 0, runningPackages: 0, completedPackages: 0, pendingPayments: 0, paidRevenue: 0 },
    lessons: { totalLessons: 0, completedLessons: 0, absentLessons: 0, scheduledLessons: 0, trialLessons: totalTrialsQ, trialConversionRate: totalTrialsQ > 0 ? Math.round((totalConvQ / totalTrialsQ) * 100 * 10) / 10 : 0 },
    teachers: {
      totalActiveTeachers: teacherDetails.length,
      lessonsTaughtThisQuarter: 0,
      totalTeachingHours: Math.round(totalTeachingHours * 100) / 100,
      totalSalary: Math.round(totalSalary * 100) / 100,
      teacherDetails,
    },
    monthlyBreakdown,
    quarterlyBonuses,
  };
}
