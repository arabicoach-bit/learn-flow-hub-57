import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeachers } from '@/hooks/use-teachers';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, getFilterLabel, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { fetchAllTeachersTotalHours, type TeacherTotalHoursResult } from '@/hooks/use-teacher-total-hours';
import { PayrollStatsCards } from '@/components/payroll/PayrollStatsCards';
import { PayrollTableView, type PayrollTeacher } from '@/components/payroll/PayrollTableView';

export default function AdminPayroll() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [editingBonus, setEditingBonus] = useState<string | null>(null);
  const [bonusValue, setBonusValue] = useState('');
  const [bonusNotes, setBonusNotes] = useState('');
  const { data: teachers, isLoading: teachersLoading } = useTeachers();

  const { startDate, endDate } = getFilterDateRange(filter);
  const monthYear =
    filter.month !== null && filter.year
      ? `${filter.year}-${String(filter.month + 1).padStart(2, '0')}`
      : format(new Date(), 'yyyy-MM');

  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['admin-payroll-unified', startDate, endDate],
    refetchInterval: 10000,
    queryFn: async () => {
      const teacherIds = (teachers || []).map((t) => t.teacher_id);
      if (teacherIds.length === 0) return [];

      const [hoursByTeacher, studentsRes, bonusesRes] = await Promise.all([
        fetchAllTeachersTotalHours(teacherIds, startDate, endDate),
        supabase.from('students').select('student_id, teacher_id, status'),
        supabase.from('teacher_bonuses').select('*').eq('month_year', monthYear),
      ]);

      const students = studentsRes.data || [];
      const bonuses = bonusesRes.data || [];

      const payroll: PayrollTeacher[] = (teachers || []).map((teacher) => {
        const hrs = hoursByTeacher[teacher.teacher_id] || ({} as TeacherTotalHoursResult);
        const teacherStudents = students.filter((s) => s.teacher_id === teacher.teacher_id);
        const bonus = bonuses.find((b) => b.teacher_id === teacher.teacher_id);
        const salaryEarned = hrs.salary || 0;
        const bonusAmount = bonus?.amount || 0;

        return {
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.name,
          email: teacher.email || null,
          lessons_taken: hrs.totalLessons || 0,
          total_hours: hrs.totalHours || 0,
          rate_per_lesson: hrs.ratePerHour || 0,
          salary_earned: salaryEarned,
          bonus: bonusAmount,
          bonus_notes: bonus?.notes || null,
          total_pay: salaryEarned + bonusAmount,
          active_students: teacherStudents.filter((s) => s.status === 'Active').length,
          temp_stop_students: teacherStudents.filter((s) => s.status === 'Temporary Stop').length,
          left_students: teacherStudents.filter((s) => s.status === 'Left').length,
          trial_lessons: 0,
        };
      });

      return payroll.sort((a, b) => b.total_pay - a.total_pay);
    },
    enabled: !!teachers,
  });

  const isLoading = teachersLoading || payrollLoading;

  // Aggregates
  const totalLessons = payrollData?.reduce((s, t) => s + t.lessons_taken, 0) || 0;
  const totalHours = payrollData?.reduce((s, t) => s + t.total_hours, 0) || 0;
  const totalSalary = payrollData?.reduce((s, t) => s + t.salary_earned, 0) || 0;
  const totalBonus = payrollData?.reduce((s, t) => s + t.bonus, 0) || 0;
  const totalPay = payrollData?.reduce((s, t) => s + t.total_pay, 0) || 0;
  const totalActiveStudents = payrollData?.reduce((s, t) => s + t.active_students, 0) || 0;
  const activeTeachers = payrollData?.filter((t) => t.lessons_taken > 0).length || 0;

  // Bonus
  const saveBonus = async (teacherId: string) => {
    const amount = parseFloat(bonusValue) || 0;
    try {
      const { error } = await supabase
        .from('teacher_bonuses')
        .upsert(
          { teacher_id: teacherId, month_year: monthYear, amount, notes: bonusNotes || null },
          { onConflict: 'teacher_id,month_year' },
        );
      if (error) throw error;
      toast.success('Bonus saved');
      setEditingBonus(null);
      queryClient.invalidateQueries({ queryKey: ['admin-payroll-unified'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to save bonus');
    }
  };

  // Export
  const exportToCSV = () => {
    if (!payrollData || payrollData.length === 0) return;
    const headers = [
      'Teacher', 'Rate/Hr (EGP)', 'Lessons', 'Hours', 'Salary (EGP)',
      'Bonus (EGP)', 'Total Pay (EGP)', 'Active', 'Temp Stopped', 'Left',
    ];
    const rows = payrollData.map((t) => [
      t.teacher_name, t.rate_per_lesson.toString(), t.lessons_taken.toString(),
      t.total_hours.toFixed(2), t.salary_earned.toFixed(2), t.bonus.toFixed(2),
      t.total_pay.toFixed(2), t.active_students.toString(),
      t.temp_stop_students.toString(), t.left_students.toString(),
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${getFilterLabel(filter)}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Teacher Analytics & Payroll</h1>
            <p className="text-muted-foreground">{getFilterLabel(filter)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <YearMonthFilter value={filter} onChange={setFilter} />
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!payrollData?.length}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <PayrollStatsCards
          isLoading={isLoading}
          activeTeachers={activeTeachers}
          totalLessons={totalLessons}
          totalHours={totalHours}
          totalSalary={totalSalary}
          totalBonus={totalBonus}
          totalPay={totalPay}
          totalActiveStudents={totalActiveStudents}
        />

        {/* Table */}
        <PayrollTableView
          data={payrollData || []}
          isLoading={isLoading}
          editingBonusId={editingBonus}
          bonusValue={bonusValue}
          onBonusValueChange={setBonusValue}
          onStartEditBonus={(t) => {
            setEditingBonus(t.teacher_id);
            setBonusValue(t.bonus.toString());
            setBonusNotes(t.bonus_notes || '');
          }}
          onSaveBonus={saveBonus}
          onCancelEditBonus={() => setEditingBonus(null)}
        />
      </div>
    </AdminLayout>
  );
}
