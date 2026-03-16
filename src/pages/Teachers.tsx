import { useState, useMemo } from 'react';
import { UserPlus, Mail, Key, Edit, Trash2, Download, Users } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeachers, useUpdateTeacher, Teacher } from '@/hooks/use-teachers';
import { TeacherFiltersBar } from '@/components/teachers/TeacherFiltersBar';
import { UnifiedTeacherStats } from '@/components/teachers/UnifiedTeacherStats';
import { UnifiedTeacherTable } from '@/components/teachers/UnifiedTeacherTable';
import { TeacherCardView } from '@/components/teachers/TeacherCardView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParamState } from '@/hooks/use-search-param-state';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast as sonnerToast } from 'sonner';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, getFilterLabel, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { fetchAllTeachersTotalHours, type TeacherTotalHoursResult } from '@/hooks/use-teacher-total-hours';
import { type PayrollTeacher } from '@/components/payroll/PayrollTableView';

export default function Teachers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teachers, isLoading, refetch } = useTeachers();
  const updateTeacher = useUpdateTeacher();

  // View mode
  const [viewMode, setViewMode] = useSearchParamState('view', 'table') as [string, (v: string) => void];

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter
  const [searchQuery, setSearchQuery] = useSearchParamState('q', '');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', rate_per_lesson: '' });
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', rate_per_lesson: '' });
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; password: string } | null>(null);

  // Teacher IDs for payroll
  const teacherIds = useMemo(() => (teachers || []).map((t) => t.teacher_id), [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter((teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && teacher.is_active !== false) ||
        (statusFilter === 'inactive' && teacher.is_active === false);
      return matchesSearch && matchesStatus;
    });
  }, [teachers, searchQuery, statusFilter]);

  // ── Payroll ───────────────────────────────────────────────────────────
  const [payrollFilter, setPayrollFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [editingBonus, setEditingBonus] = useState<string | null>(null);
  const [bonusValue, setBonusValue] = useState('');
  const [bonusNotes, setBonusNotes] = useState('');

  const { startDate, endDate } = getFilterDateRange(payrollFilter);
  const monthYear =
    payrollFilter.month !== null && payrollFilter.year
      ? `${payrollFilter.year}-${String(payrollFilter.month + 1).padStart(2, '0')}`
      : format(new Date(), 'yyyy-MM');

  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['admin-payroll-unified', startDate, endDate],
    refetchInterval: 10000,
    queryFn: async () => {
      const ids = (teachers || []).map((t) => t.teacher_id);
      if (ids.length === 0) return [] as PayrollTeacher[];

      const [hoursByTeacher, studentsRes, bonusesRes] = await Promise.all([
        fetchAllTeachersTotalHours(ids, startDate, endDate),
        supabase.from('students').select('student_id, teacher_id, status'),
        supabase.from('teacher_bonuses').select('*').eq('month_year', monthYear),
      ]);

      const students = studentsRes.data || [];
      const bonuses = bonusesRes.data || [];

      return (teachers || []).map((teacher): PayrollTeacher => {
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
    },
    enabled: !!teachers,
  });

  const isPayrollLoading = isLoading || payrollLoading;

  // Build payroll map for table
  const payrollMap = useMemo(() => {
    const map: Record<string, PayrollTeacher> = {};
    payrollData?.forEach((p) => { map[p.teacher_id] = p; });
    return map;
  }, [payrollData]);

  // Payroll aggregates
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
      sonnerToast.success('Bonus saved');
      setEditingBonus(null);
      queryClient.invalidateQueries({ queryKey: ['admin-payroll-unified'] });
    } catch (e: any) {
      sonnerToast.error(e.message || 'Failed to save bonus');
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
    a.download = `teachers-payroll-${getFilterLabel(payrollFilter)}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ── Handlers ──────────────────────────────────────────────────────────

  const extractFunctionErrorMessage = async (fnError: unknown): Promise<string> => {
    const anyErr = fnError as any;
    const baseMsg = typeof anyErr?.message === 'string' ? anyErr.message : 'Request failed';
    const ctx = anyErr?.context;
    if (ctx && typeof ctx === 'object') {
      if (typeof ctx.clone === 'function' && typeof ctx.json === 'function') {
        try {
          const json = await ctx.clone().json();
          const msg = json?.error || json?.message;
          if (typeof msg === 'string' && msg.trim()) return msg;
        } catch { /* ignore */ }
      }
    }
    return baseMsg;
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim().length < 3) {
      toast({ title: 'Validation Error', description: 'Name must be at least 3 characters', variant: 'destructive' });
      return;
    }
    if (!formData.email || !formData.email.includes('@')) {
      toast({ title: 'Validation Error', description: 'Please enter a valid email', variant: 'destructive' });
      return;
    }
    const parsedRate = Number.parseFloat(formData.rate_per_lesson);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast({ title: 'Validation Error', description: 'Rate must be a positive number', variant: 'destructive' });
      return;
    }
    const normalizedEmail = formData.email.trim().toLowerCase();
    setIsSubmitting(true);
    try {
      const { data: existingProfiles } = await supabase.from('profiles').select('id').eq('email', normalizedEmail).limit(1);
      if (existingProfiles && existingProfiles.length > 0) {
        toast({ title: 'Email already in use', description: 'This email already has an account. Use a different one.', variant: 'destructive' });
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-teacher-account', {
        body: { name: formData.name.trim(), email: normalizedEmail, phone: formData.phone?.trim() || undefined, rate_per_lesson: parsedRate },
      });
      if (error) { const msg = await extractFunctionErrorMessage(error); throw new Error(msg); }
      if (data?.error) throw new Error(data.error);
      if (!data?.temp_password) throw new Error('Invalid response from server');
      setTempPasswordInfo({ email: formData.email, password: data.temp_password });
      toast({ title: 'Teacher Created', description: `Account created for ${formData.name}.` });
      setIsAddDialogOpen(false);
      setFormData({ name: '', phone: '', email: '', rate_per_lesson: '' });
      refetch();
    } catch (error: any) {
      let errorMessage = error?.message || 'Failed to create teacher account';
      if (errorMessage.toLowerCase().includes('email already exists') || errorMessage.toLowerCase().includes('already registered')) {
        errorMessage = 'This email is already registered. Use a different one.';
      }
      toast({ title: 'Error Creating Teacher', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    try {
      await updateTeacher.mutateAsync({
        teacherId: selectedTeacher.teacher_id,
        name: editFormData.name,
        phone: editFormData.phone || undefined,
        rate_per_lesson: parseFloat(editFormData.rate_per_lesson),
      });
      toast({ title: 'Teacher updated successfully!' });
      setIsEditDialogOpen(false);
      setSelectedTeacher(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update teacher', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('teacher_id', selectedTeacher.teacher_id).single();
      if (!profile) throw new Error('No user account found for this teacher');
      const { data, error } = await supabase.functions.invoke('create-teacher-account', {
        body: { teacher_id: selectedTeacher.teacher_id, user_id: profile.id, email: selectedTeacher.email, name: selectedTeacher.name },
        headers: { 'x-action': 'reset-password' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTempPasswordInfo({ email: selectedTeacher.email || '', password: data.temp_password });
      toast({ title: 'Password Reset', description: 'New temporary password generated.' });
      setIsResetPasswordDialogOpen(false);
      setSelectedTeacher(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reset password', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (teacher: Teacher, activate: boolean) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('teacher_id', teacher.teacher_id).single();
      if (!profile) throw new Error('No user account found');
      const { data, error } = await supabase.functions.invoke('create-teacher-account?action=toggle-active', {
        body: { teacher_id: teacher.teacher_id, user_id: profile.id, is_active: activate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: activate ? 'Teacher Activated' : 'Teacher Deactivated', description: `${teacher.name} status updated.` });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('teacher_id', selectedTeacher.teacher_id).single();
      if (!profile) throw new Error('No user account found');
      const { data, error } = await supabase.functions.invoke('create-teacher-account?action=delete', {
        body: { teacher_id: selectedTeacher.teacher_id, user_id: profile.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Teacher deleted successfully!' });
      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete teacher', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditFormData({ name: teacher.name, phone: teacher.phone || '', rate_per_lesson: teacher.rate_per_lesson.toString() });
    setIsEditDialogOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Teachers</h1>
            <p className="text-muted-foreground">
              Manage accounts, performance & payroll · {getFilterLabel(payrollFilter)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <YearMonthFilter value={payrollFilter} onChange={setPayrollFilter} />
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!payrollData?.length}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Teacher
            </Button>
          </div>
        </div>

        {/* Unified Stats */}
        {teachers && (
          <UnifiedTeacherStats
            teachers={teachers}
            isPayrollLoading={isPayrollLoading}
            activeTeachers={activeTeachers}
            totalLessons={totalLessons}
            totalHours={totalHours}
            totalSalary={totalSalary}
            totalBonus={totalBonus}
            totalPay={totalPay}
            totalActiveStudents={totalActiveStudents}
          />
        )}

        {/* Filters */}
        <TeacherFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter as 'all' | 'active' | 'inactive'}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode as 'table' | 'card'}
          onViewModeChange={setViewMode}
          teacherCount={teachers?.length ?? 0}
        />

        {/* Unified Table / Card View */}
        {viewMode === 'table' ? (
          <UnifiedTeacherTable
            teachers={filteredTeachers}
            payrollMap={payrollMap}
            isLoading={isPayrollLoading}
            editingBonusId={editingBonus}
            bonusValue={bonusValue}
            onBonusValueChange={setBonusValue}
            onStartEditBonus={(pr) => {
              setEditingBonus(pr.teacher_id);
              setBonusValue(pr.bonus.toString());
              setBonusNotes(pr.bonus_notes || '');
            }}
            onSaveBonus={saveBonus}
            onCancelEditBonus={() => setEditingBonus(null)}
            onEdit={openEditDialog}
            onResetPassword={(t) => { setSelectedTeacher(t); setIsResetPasswordDialogOpen(true); }}
            onToggleActive={handleToggleActive}
            onDelete={(t) => { setSelectedTeacher(t); setIsDeleteDialogOpen(true); }}
          />
        ) : (
          <TeacherCardView
            teachers={filteredTeachers}
            payrollMap={payrollMap}
            isLoading={isPayrollLoading}
            onEdit={openEditDialog}
            onResetPassword={(t) => { setSelectedTeacher(t); setIsResetPasswordDialogOpen(true); }}
            onToggleActive={handleToggleActive}
            onDelete={(t) => { setSelectedTeacher(t); setIsDeleteDialogOpen(true); }}
          />
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}

      {/* Add Teacher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Add New Teacher
            </DialogTitle>
            <DialogDescription>
              Create a new teacher account. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTeacher} className="space-y-4" method="post">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="John Smith" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="teacher@academy.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+234 123 456 7890" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate per Hour (EGP) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">EGP</span>
                <Input id="rate" type="number" step="0.01" min="0" placeholder="200" className="pl-12" value={formData.rate_per_lesson} onChange={(e) => setFormData({ ...formData, rate_per_lesson: e.target.value })} required />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Teacher Account'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Edit Teacher</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeacher} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input id="edit-name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Rate per Hour *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">EGP</span>
                <Input id="edit-rate" type="number" step="0.01" min="0" className="pl-12" value={editFormData.rate_per_lesson} onChange={(e) => setEditFormData({ ...editFormData, rate_per_lesson: e.target.value })} required />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new temporary password for {selectedTeacher?.name}. They will be required to change it on their next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isSubmitting}>{isSubmitting ? 'Resetting...' : 'Reset Password'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete <strong>{selectedTeacher?.name}</strong>?</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Remove teacher account permanently</li>
                <li>Unassign from all students</li>
                <li>Keep historical lesson records</li>
              </ul>
              <p className="text-sm font-medium text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? 'Deleting...' : 'Yes, Delete Teacher'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temporary Password Display */}
      <Dialog open={!!tempPasswordInfo} onOpenChange={() => setTempPasswordInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Mail className="w-5 h-5" /> Credentials Ready
            </DialogTitle>
            <DialogDescription>
              Share these login credentials with the teacher. They must change the password on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="font-mono text-sm">{tempPasswordInfo?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Temporary Password</Label>
                <p className="font-mono text-lg font-bold tracking-wider">{tempPasswordInfo?.password}</p>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${tempPasswordInfo?.email}\nPassword: ${tempPasswordInfo?.password}`);
                toast({ title: 'Copied to clipboard!' });
              }}
            >
              Copy Credentials
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
