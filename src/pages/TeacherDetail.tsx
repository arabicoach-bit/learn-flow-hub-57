import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, DollarSign, Key, Trash2, Pencil, UserX, UserCheck, CalendarDays, Save } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeacher, useUpdateTeacher } from '@/hooks/use-teachers';
import { useStudents } from '@/hooks/use-students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatSalary } from '@/lib/wallet-utils';
import { TeacherCalendar } from '@/components/calendar/TeacherCalendar';
import { TrialLessonCalendar } from '@/components/calendar/TrialLessonCalendar';
import { TeacherStudentsTab } from '@/components/teachers/TeacherStudentsTab';
import { TeacherPayrollTab } from '@/components/teachers/TeacherPayrollTab';

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: teacher, isLoading: teacherLoading, refetch: refetchTeacher } = useTeacher(id || '');
  const { data: allStudents } = useStudents();

  const teacherStudents = allStudents?.filter((s) => s.teacher_id === id) || [];
  const totalStudents = teacherStudents.length;

  // Edit teacher state
  const updateTeacher = useUpdateTeacher();
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

  // ── Handlers ──────────────────────────────────────────────────────────

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
      const { data: profile } = await supabase.from('profiles').select('id').eq('teacher_id', id).single();
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
      const { data: profile } = await supabase.from('profiles').select('id').eq('teacher_id', id).single();
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
      const { data: profile } = await supabase.from('profiles').select('id').eq('teacher_id', id).single();
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

  // ── Loading / Not Found ───────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────

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

        {/* Inline Edit */}
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
                  <Save className="w-4 h-4 mr-1" />
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
            <TabsTrigger value="calendar">
              <CalendarDays className="w-4 h-4 mr-1" /> Lessons Calendar
            </TabsTrigger>
            <TabsTrigger value="trials">Trial Lessons</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <TeacherStudentsTab students={teacherStudents} teacherId={id} />
          </TabsContent>

          <TabsContent value="payroll">
            {id && <TeacherPayrollTab teacherId={id} ratePerLesson={teacher.rate_per_lesson} />}
          </TabsContent>

          <TabsContent value="calendar">
            {id && <TeacherCalendar teacherId={id} />}
          </TabsContent>

          <TabsContent value="trials">
            {id && <TrialLessonCalendar teacherId={id} isAdmin />}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}

      {/* Reset Password */}
      <AlertDialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new temporary password for {teacher.name}. They will be required to change it on next login.
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

      {/* Delete */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete <strong>{teacher.name}</strong>?</p>
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
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
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
