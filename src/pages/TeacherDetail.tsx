import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, DollarSign, GraduationCap, BookOpen, TrendingUp, Receipt, Users, UserCheck, PauseCircle, UserX, Search, Clock, Check, X, Loader2, Edit2, Key, Trash2, MoreVertical, Pencil, Eye, ChevronRight } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeacher, useUpdateTeacher } from '@/hooks/use-teachers';
import { useStudents, useUpdateStudent, Student } from '@/hooks/use-students';
import { usePrograms } from '@/hooks/use-programs';
import { useTeacherTotalHours } from '@/hooks/use-teacher-total-hours';
import { Button } from '@/components/ui/button';
import { getWalletColor, getStatusDisplayLabel, formatSalary, formatDate, getWalletDisplayLabel } from '@/lib/wallet-utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { LessonCard } from '@/components/schedule/LessonCard';
import { EditStudentDialog } from '@/components/teacher/EditStudentDialog';
import { toast as sonnerToast } from 'sonner';

// ── Salary history hook ──
interface SalaryHistoryRecord {
  monthLabel: string;
  monthDate: string;
  lessons: number;
  hours: number;
  salary: number;
  isPending: boolean;
}

function useTeacherSalaryHistory(teacherId: string) {
  return useQuery({
    queryKey: ['teacher-salary-history', teacherId],
    queryFn: async () => {
      const { data: lessons } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_date, duration_minutes')
        .eq('teacher_id', teacherId)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false });

      const { data: trials } = await supabase
        .from('trial_lessons_log')
        .select('lesson_date')
        .eq('teacher_id', teacherId)
        .eq('status', 'completed');

      const { data: teacher } = await supabase
        .from('teachers')
        .select('rate_per_lesson')
        .eq('teacher_id', teacherId)
        .single();

      const rate = teacher?.rate_per_lesson || 0;
      const monthMap: Record<string, { monthLabel: string; monthDate: string; lessons: number; minutes: number; trialCount: number }> = {};

      lessons?.forEach(l => {
        const monthKey = l.scheduled_date.slice(0, 7);
        const monthLabel = format(new Date(monthKey + '-01'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].lessons += 1;
        monthMap[monthKey].minutes += l.duration_minutes || 0;
      });

      trials?.forEach(t => {
        const monthKey = t.lesson_date.slice(0, 7);
        const monthLabel = format(new Date(monthKey + '-01'), 'MMM yyyy');
        if (!monthMap[monthKey]) monthMap[monthKey] = { monthLabel, monthDate: monthKey, lessons: 0, minutes: 0, trialCount: 0 };
        monthMap[monthKey].trialCount += 1;
      });

      const currentMonth = format(new Date(), 'yyyy-MM');

      return Object.values(monthMap)
        .sort((a, b) => b.monthDate.localeCompare(a.monthDate))
        .map(m => {
          const regularHours = m.minutes / 60;
          const trialHours = m.trialCount * 0.5;
          const totalHours = regularHours + trialHours;
          const totalLessons = m.lessons + m.trialCount;
          return {
            monthLabel: m.monthLabel,
            monthDate: m.monthDate,
            lessons: totalLessons,
            hours: totalHours,
            salary: Math.round(totalHours * rate * 100) / 100,
            isPending: m.monthDate === currentMonth,
          } as SalaryHistoryRecord;
        });
    },
    enabled: !!teacherId,
  });
}

// ── Today's lessons hook for admin context ──
function useAdminTeacherTodayLessons(teacherId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['admin-teacher-today-lessons', teacherId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select('*, students!scheduled_lessons_student_id_fkey(name, phone, wallet_balance, status)')
        .eq('teacher_id', teacherId!)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });
}

// ── Trial lessons hook for admin context ──
function useAdminTeacherTrialLessons(teacherId: string | undefined, startDate: string | null, endDate: string | null) {
  return useQuery({
    queryKey: ['admin-teacher-trial-lessons', teacherId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('trial_lessons_log')
        .select('*, trial_students!trial_lessons_log_trial_student_id_fkey(name, phone)')
        .eq('teacher_id', teacherId!)
        .order('lesson_date', { ascending: false });

      if (startDate) query = query.gte('lesson_date', startDate);
      if (endDate) query = query.lte('lesson_date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });
}

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teacher, isLoading: teacherLoading, refetch: refetchTeacher } = useTeacher(id || '');

  const { data: allStudents } = useStudents();
  const { data: programs } = usePrograms();
  const { data: todayLessons, refetch: refetchToday } = useAdminTeacherTodayLessons(id);

  const [payrollFilter, setPayrollFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const payrollRange = getFilterDateRange(payrollFilter);
  const { data: filteredStats } = useTeacherTotalHours(id, payrollRange.startDate, payrollRange.endDate);
  const { data: salaryHistory } = useTeacherSalaryHistory(id || '');

  const [trialFilter, setTrialFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const trialRange = getFilterDateRange(trialFilter);
  const { data: trialLessons } = useAdminTeacherTrialLessons(id, trialRange.startDate, trialRange.endDate);
  const [trialStatusFilter, setTrialStatusFilter] = useState<string>('all');

  const teacherStudents = allStudents?.filter(s => s.teacher_id === id) || [];

  // Students tab filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const filteredStudents = useMemo(() => {
    return teacherStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.phone.includes(studentSearch);
      const matchesStatus = studentStatusFilter === 'all' || s.status === studentStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [teacherStudents, studentSearch, studentStatusFilter]);

  // Filtered trial lessons
  const filteredTrials = useMemo(() => {
    if (!trialLessons) return [];
    if (trialStatusFilter === 'all') return trialLessons;
    return trialLessons.filter((t: any) => t.status?.toLowerCase() === trialStatusFilter.toLowerCase());
  }, [trialLessons, trialStatusFilter]);

  // Trial stats
  const trialStats = useMemo(() => {
    if (!trialLessons) return { total: 0, completed: 0, scheduled: 0, absent: 0 };
    return {
      total: trialLessons.length,
      completed: trialLessons.filter((t: any) => t.status === 'completed').length,
      scheduled: trialLessons.filter((t: any) => t.status === 'scheduled').length,
      absent: trialLessons.filter((t: any) => t.status === 'absent').length,
    };
  }, [trialLessons]);

  // Edit teacher state
  const updateTeacher = useUpdateTeacher();
  const updateStudent = useUpdateStudent();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', rate_per_lesson: '' });

  // Action dialog states
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name,
        phone: teacher.phone || '',
        email: teacher.email || '',
        rate_per_lesson: teacher.rate_per_lesson?.toString() || '',
      });
    }
  }, [teacher]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateTeacher.mutateAsync({
        teacherId: id,
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        rate_per_lesson: formData.rate_per_lesson ? parseFloat(formData.rate_per_lesson) : undefined,
      });
      toast({ title: 'Teacher updated successfully!' });
      setIsEditing(false);
    } catch {
      toast({ title: 'Error updating teacher', variant: 'destructive' });
    }
  };

  const handleToggleActive = async () => {
    if (!teacher || !id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('teacher_id', id)
        .single();
      if (!profile) throw new Error('No user account found');

      const newActive = teacher.is_active === false;
      const { data, error } = await supabase.functions.invoke('create-teacher-account?action=toggle-active', {
        body: { teacher_id: id, user_id: profile.id, is_active: newActive },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: newActive ? 'Teacher Activated' : 'Teacher Deactivated' });
      refetchTeacher();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleResetPassword = async () => {
    if (!teacher || !id) return;
    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('teacher_id', id)
        .single();
      if (!profile) throw new Error('No user account found');

      const { data, error } = await supabase.functions.invoke('create-teacher-account', {
        body: { teacher_id: id, user_id: profile.id, email: teacher.email, name: teacher.name },
        headers: { 'x-action': 'reset-password' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTempPasswordInfo({ email: teacher.email || '', password: data.temp_password });
      toast({ title: 'Password reset successfully' });
      setIsResetPasswordOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacher || !id) return;
    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('teacher_id', id)
        .single();
      if (!profile) throw new Error('No user account found');

      const { data, error } = await supabase.functions.invoke('create-teacher-account?action=delete', {
        body: { teacher_id: id, user_id: profile.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Teacher deleted successfully' });
      navigate('/admin/teachers');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentStatusChange = async (student: Student, newStatus: 'Active' | 'Temporary Stop' | 'Left') => {
    try {
      await updateStudent.mutateAsync({ studentId: student.student_id, status: newStatus });
      sonnerToast.success(`${student.name} status changed to ${getStatusDisplayLabel(newStatus)}`);
    } catch {
      sonnerToast.error('Failed to update status');
    }
  };

  const getProgramName = (programId: string | null) => {
    if (!programId) return '-';
    return programs?.find(p => p.program_id === programId)?.name || '-';
  };

  // KPI calculations
  const totalStudents = teacherStudents.length;
  const activeStudents = teacherStudents.filter(s => s.status === 'Active').length;
  const tempStopStudents = teacherStudents.filter(s => s.status === 'Temporary Stop').length;
  const leftStudents = teacherStudents.filter(s => s.status === 'Left').length;

  const currentMonthFilter = getDefaultFilter();
  const currentMonthRange = getFilterDateRange(currentMonthFilter);
  const { data: currentMonthStats } = useTeacherTotalHours(id, currentMonthRange.startDate, currentMonthRange.endDate);

  if (teacherLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!teacher) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Teacher not found</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Back</Button>
        </div>
      </AdminLayout>
    );
  }

  const isActive = teacher.is_active !== false;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold">{teacher.name}</h1>
              <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              {teacher.phone && (
                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {teacher.phone}</span>
              )}
              {teacher.email && (
                <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {teacher.email}</span>
              )}
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> {formatSalary(teacher.rate_per_lesson)} / hour
              </span>
            </div>
          </div>

          {/* Icon Action Buttons */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Teacher</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsResetPasswordOpen(true)}>
                    <Key className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Password</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleActive}
                    className={isActive ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}
                  >
                    {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isActive ? 'Deactivate' : 'Activate'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setIsDeleteOpen(true)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Teacher</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {isEditing && (
          <Card>
            <CardHeader><CardTitle>Edit Teacher</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Hour (EGP)</Label>
                  <Input type="number" step="0.01" value={formData.rate_per_lesson} onChange={(e) => setFormData({ ...formData, rate_per_lesson: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateTeacher.isPending}>
                  {updateTeacher.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Students ({totalStudents})</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="today">Today's Lessons ({todayLessons?.length || 0})</TabsTrigger>
            <TabsTrigger value="trials">Trial Lessons ({trialStats.total})</TabsTrigger>
          </TabsList>

          {/* ── Tab A: Students ── */}
          <TabsContent value="students">
            <div className="space-y-4">
              {/* Student Stats Accordion */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                  <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
                  Student Statistics
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xl font-bold">{totalStudents}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="text-xl font-bold">{activeStudents}</p>
                            <p className="text-xs text-muted-foreground">Active</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <PauseCircle className="w-4 h-4 text-amber-500" />
                          <div>
                            <p className="text-xl font-bold">{tempStopStudents}</p>
                            <p className="text-xs text-muted-foreground">Temp Stop</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <UserX className="w-4 h-4 text-destructive" />
                          <div>
                            <p className="text-xl font-bold">{leftStudents}</p>
                            <p className="text-xs text-muted-foreground">Left</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xl font-bold">{totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}%</p>
                            <p className="text-xs text-muted-foreground">Retention</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name or phone..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="pl-10" />
                </div>
                <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Temporary Stop">Temporary Stop</SelectItem>
                    <SelectItem value="Left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Phone</th>
                        <th>Program</th>
                        <th>Level</th>
                        <th>Status</th>
                        <th>Wallet</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No students found</td></tr>
                      ) : (
                        filteredStudents.map((student) => (
                          <tr key={student.student_id}>
                            <td>
                              <div>
                                <p className="font-medium">{student.name}</p>
                                {student.parent_guardian_name && (
                                  <p className="text-xs text-muted-foreground">Parent: {student.parent_guardian_name}</p>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="text-sm">
                                <p>{student.phone}</p>
                                {student.parent_phone && (
                                  <p className="text-xs text-muted-foreground">{student.parent_phone}</p>
                                )}
                              </div>
                            </td>
                            <td className="text-sm">{getProgramName(student.program_id)}</td>
                            <td className="text-sm">{student.student_level || '-'}</td>
                            <td>
                              <Select
                                value={student.status || 'Active'}
                                onValueChange={(v) => handleStudentStatusChange(student, v as any)}
                              >
                                <SelectTrigger className="h-7 w-[130px] text-xs">
                                  <Badge variant="outline" className={
                                    student.status === 'Active' ? 'status-active border-0' :
                                    student.status === 'Temporary Stop' ? 'status-grace border-0' : 'status-blocked border-0'
                                  }>
                                    {getStatusDisplayLabel(student.status)}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Active">✅ Active</SelectItem>
                                  <SelectItem value="Temporary Stop">⏸️ Temp Stop</SelectItem>
                                  <SelectItem value="Left">❌ Left</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td>
                              <span className={`font-medium ${getWalletColor(student.wallet_balance || 0)}`}>
                                {getWalletDisplayLabel(student.wallet_balance || 0)}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingStudent(student)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Student</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/students/${student.student_id}`)}>
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Student</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ── Tab B: Payroll ── */}
          <TabsContent value="payroll">
            <div className="space-y-4">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                  <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
                  Payroll Summary
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex items-center justify-end mb-2">
                    <YearMonthFilter value={payrollFilter} onChange={setPayrollFilter} />
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Completed Lessons</p>
                          <p className="text-2xl font-bold">{filteredStats?.totalLessons ?? '...'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Teaching Hours</p>
                          <p className="text-2xl font-bold">{filteredStats ? `${filteredStats.totalHours.toFixed(1)}h` : '...'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Rate/Hour</p>
                          <p className="text-2xl font-bold">{formatSalary(teacher.rate_per_lesson)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Salary (EGP)</p>
                          <p className="text-2xl font-bold text-emerald-500">{filteredStats ? formatSalary(filteredStats.salary) : '...'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              <Card className="overflow-hidden">
                <CardHeader><CardTitle className="text-base">Payment Records</CardTitle></CardHeader>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Lessons</th>
                      <th>Hours</th>
                      <th>Salary (EGP)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!salaryHistory?.length ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No salary history yet</td></tr>
                    ) : (
                      <>
                        {salaryHistory.map((record) => (
                          <tr key={record.monthDate}>
                            <td>{record.monthLabel}</td>
                            <td>{record.lessons}</td>
                            <td>{record.hours.toFixed(1)}h</td>
                            <td className="font-medium">{formatSalary(record.salary)}</td>
                            <td>
                              <Badge variant="outline" className={record.isPending ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'}>
                                {record.isPending ? '⏳ Pending' : '✅ Paid'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t">
                          <td>All Time Total</td>
                          <td>{salaryHistory.reduce((s, r) => s + r.lessons, 0)}</td>
                          <td>{salaryHistory.reduce((s, r) => s + r.hours, 0).toFixed(1)}h</td>
                          <td>{formatSalary(salaryHistory.reduce((s, r) => s + r.salary, 0))}</td>
                          <td></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </TabsContent>

          {/* ── Tab C: Today's Lessons ── */}
          <TabsContent value="today">
            <div className="space-y-4">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                  <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
                  Today's Statistics
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xl font-bold">{todayLessons?.length || 0}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="text-xl font-bold">{todayLessons?.filter((l: any) => l.status === 'completed').length || 0}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <div>
                            <p className="text-xl font-bold">{todayLessons?.filter((l: any) => l.status === 'scheduled').length || 0}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-destructive" />
                          <div>
                            <p className="text-xl font-bold">{todayLessons?.filter((l: any) => l.status === 'absent').length || 0}</p>
                            <p className="text-xs text-muted-foreground">Absent</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {!todayLessons?.length ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  No lessons scheduled for today
                </Card>
              ) : (
                <div className="space-y-4">
                  {todayLessons.map((lesson: any) => (
                    <LessonCard
                      key={lesson.scheduled_lesson_id}
                      lesson={lesson}
                      onUpdated={() => refetchToday()}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Tab D: Trial Lessons ── */}
          <TabsContent value="trials">
            <div className="space-y-4">
              {/* Trial Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xl font-bold">{trialStats.total}</p>
                        <p className="text-xs text-muted-foreground">Total Trials</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-xl font-bold">{trialStats.completed}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="text-xl font-bold">{trialStats.scheduled}</p>
                        <p className="text-xs text-muted-foreground">Scheduled</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-destructive" />
                      <div>
                        <p className="text-xl font-bold">{trialStats.absent}</p>
                        <p className="text-xs text-muted-foreground">Absent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <YearMonthFilter value={trialFilter} onChange={setTrialFilter} />
                <Select value={trialStatusFilter} onValueChange={setTrialStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Student</th>
                      <th>Phone</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredTrials.length ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No trial lessons found</td></tr>
                    ) : (
                      filteredTrials.map((trial: any) => (
                        <TrialLessonRow key={trial.trial_lesson_id} trial={trial} />
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Student Dialog */}
      <EditStudentDialog
        student={editingStudent}
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      />

      {/* Reset Password Confirmation */}
      <AlertDialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" /> Reset Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new temporary password for {teacher?.name}.
              They will be required to change it on their next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Teacher
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete <strong>{teacher?.name}</strong>?</p>
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
              {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temp Password Display */}
      <Dialog open={!!tempPasswordInfo} onOpenChange={() => setTempPasswordInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Mail className="w-5 h-5" /> Credentials Ready
            </DialogTitle>
            <DialogDescription>Share these credentials with the teacher.</DialogDescription>
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

// ── Trial Lesson Row with inline actions ──
function TrialLessonRow({ trial }: { trial: any }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const handleMarkTrial = async (status: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({ status })
        .eq('trial_lesson_id', trial.trial_lesson_id);
      if (error) throw error;
      sonnerToast.success(`Trial marked as ${status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-trial-lessons'] });
    } catch (err: any) {
      sonnerToast.error('Failed', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const statusBadgeClass = trial.status === 'completed'
    ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
    : trial.status === 'absent'
    ? 'bg-red-500/20 text-red-600 border-red-500/30'
    : 'bg-muted text-muted-foreground';

  return (
    <tr>
      <td>{formatDate(trial.lesson_date)}</td>
      <td>{formatTime(trial.lesson_time)}</td>
      <td className="font-medium">{trial.trial_students?.name || '-'}</td>
      <td className="text-sm text-muted-foreground">{trial.trial_students?.phone || '-'}</td>
      <td>{trial.duration_minutes} min</td>
      <td><Badge variant="outline" className={statusBadgeClass}>{trial.status}</Badge></td>
      <td className="text-sm text-muted-foreground max-w-[150px] truncate">{trial.notes || '-'}</td>
      <td>
        {trial.status === 'scheduled' && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleMarkTrial('completed')} disabled={isSaving}>
              <Check className="w-3 h-3" /> Done
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => handleMarkTrial('absent')} disabled={isSaving}>
              <X className="w-3 h-3" /> Absent
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
