import { useState, useMemo } from 'react';
import { UserPlus, Mail, Key, Edit, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeachers, useUpdateTeacher, Teacher } from '@/hooks/use-teachers';
import { useTeachersBatchStats } from '@/hooks/use-teachers-batch-stats';
import { TeacherStatsCards } from '@/components/teachers/TeacherStatsCards';
import { TeacherFiltersBar } from '@/components/teachers/TeacherFiltersBar';
import { TeacherTableView } from '@/components/teachers/TeacherTableView';
import { TeacherCardView } from '@/components/teachers/TeacherCardView';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Teachers() {
  const { toast } = useToast();
  const { data: teachers, isLoading, refetch } = useTeachers();
  const updateTeacher = useUpdateTeacher();

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', rate_per_lesson: '' });
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', rate_per_lesson: '' });
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; password: string } | null>(null);

  // Batch stats
  const teacherIds = useMemo(() => (teachers || []).map((t) => t.teacher_id), [teachers]);
  const { data: batchStats } = useTeachersBatchStats(teacherIds);

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
            <h1 className="text-3xl font-display font-bold">Teacher Management</h1>
            <p className="text-muted-foreground">Manage teacher accounts, performance & payroll</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" /> Add Teacher
          </Button>
        </div>

        {/* Stats Cards */}
        {teachers && <TeacherStatsCards teachers={teachers} batchStats={batchStats} />}

        {/* Filters */}
        <TeacherFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          teacherCount={teachers?.length ?? 0}
        />

        {/* Content */}
        {viewMode === 'table' ? (
          <TeacherTableView
            teachers={filteredTeachers}
            batchStats={batchStats}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onResetPassword={(t) => { setSelectedTeacher(t); setIsResetPasswordDialogOpen(true); }}
            onToggleActive={handleToggleActive}
            onDelete={(t) => { setSelectedTeacher(t); setIsDeleteDialogOpen(true); }}
          />
        ) : (
          <TeacherCardView
            teachers={filteredTeachers}
            batchStats={batchStats}
            isLoading={isLoading}
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
