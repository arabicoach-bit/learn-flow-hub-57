import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserPlus, Mail, Key, UserX, UserCheck, Trash2, Edit, MoreVertical, Users, Filter } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeachers, useUpdateTeacher, Teacher } from '@/hooks/use-teachers';
import { useClasses } from '@/hooks/use-classes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { z } from 'zod';

// Extended teacher type with profile info
interface TeacherWithProfile extends Teacher {
  user_id?: string;
  classes_count?: number;
}

// Form validation schema
const teacherFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  rate_per_lesson: z.number().positive('Rate must be greater than 0'),
});

export default function Teachers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: teachers, isLoading, refetch } = useTeachers();
  const { data: classes } = useClasses();
  const updateTeacher = useUpdateTeacher();

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state for adding teacher
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    rate_per_lesson: '',
    class_ids: [] as string[],
  });

  // Form state for editing teacher
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    rate_per_lesson: '',
  });

  // Store temp password for display after creation
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; password: string } | null>(null);

  // Filter teachers based on search and status
  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    
    return teachers.filter((teacher) => {
      const matchesSearch = 
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (teacher.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && (teacher as TeacherWithProfile).is_active !== false) ||
        (statusFilter === 'inactive' && (teacher as TeacherWithProfile).is_active === false);
      
      return matchesSearch && matchesStatus;
    });
  }, [teachers, searchQuery, statusFilter]);

  const resetAddForm = () => {
    setFormData({ name: '', phone: '', email: '', rate_per_lesson: '', class_ids: [] });
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    try {
      teacherFormSchema.parse({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        rate_per_lesson: parseFloat(formData.rate_per_lesson) || 0,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-teacher-account', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          rate_per_lesson: parseFloat(formData.rate_per_lesson),
          class_ids: formData.class_ids.length > 0 ? formData.class_ids : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Show temporary password
      setTempPasswordInfo({
        email: formData.email,
        password: data.temp_password,
      });

      toast({
        title: 'Teacher Created',
        description: `Account created for ${formData.name}. Copy the temporary password to share with them.`,
      });
      
      setIsAddDialogOpen(false);
      resetAddForm();
      refetch();
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create teacher account',
        variant: 'destructive',
      });
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
      toast({
        title: 'Error',
        description: error.message || 'Failed to update teacher',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedTeacher) return;

    setIsSubmitting(true);
    
    try {
      // First get the user_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('teacher_id', selectedTeacher.teacher_id)
        .single();

      if (!profile) {
        throw new Error('No user account found for this teacher');
      }

      const { data, error } = await supabase.functions.invoke('create-teacher-account', {
        body: {
          teacher_id: selectedTeacher.teacher_id,
          user_id: profile.id,
          email: selectedTeacher.email,
          name: selectedTeacher.name,
        },
        headers: { 'x-action': 'reset-password' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTempPasswordInfo({
        email: selectedTeacher.email || '',
        password: data.temp_password,
      });

      toast({
        title: 'Password Reset',
        description: 'New temporary password generated. Copy it to share with the teacher.',
      });
      
      setIsResetPasswordDialogOpen(false);
      setSelectedTeacher(null);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (teacher: TeacherWithProfile, activate: boolean) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('teacher_id', teacher.teacher_id)
        .single();

      if (!profile) {
        throw new Error('No user account found for this teacher');
      }

      const { data, error } = await supabase.functions.invoke('create-teacher-account?action=toggle-active', {
        body: {
          teacher_id: teacher.teacher_id,
          user_id: profile.id,
          is_active: activate,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: activate ? 'Teacher Activated' : 'Teacher Deactivated',
        description: activate 
          ? `${teacher.name} can now login and access the system.`
          : `${teacher.name} can no longer login.`,
      });
      
      refetch();
    } catch (error: any) {
      console.error('Error toggling teacher status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update teacher status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;

    setIsSubmitting(true);
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('teacher_id', selectedTeacher.teacher_id)
        .single();

      if (!profile) {
        throw new Error('No user account found for this teacher');
      }

      const { data, error } = await supabase.functions.invoke('create-teacher-account?action=delete', {
        body: {
          teacher_id: selectedTeacher.teacher_id,
          user_id: profile.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Teacher deleted successfully!' });
      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
      refetch();
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete teacher',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (teacher: TeacherWithProfile) => {
    setSelectedTeacher(teacher);
    setEditFormData({
      name: teacher.name,
      phone: teacher.phone || '',
      rate_per_lesson: teacher.rate_per_lesson.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Teacher Management</h1>
            <p className="text-muted-foreground">Manage teacher accounts and permissions</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" /> Add Teacher
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Teachers Table/Grid */}
        <div className="glass-card rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No teachers found' : 'No teachers added yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Add your first teacher to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" /> Add Teacher
                </Button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th className="hidden sm:table-cell">Phone</th>
                  <th className="hidden md:table-cell">Rate/Lesson</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => {
                  const t = teacher as TeacherWithProfile;
                  const isActive = t.is_active !== false;
                  
                  return (
                    <tr key={teacher.teacher_id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {getInitials(teacher.name)}
                          </div>
                          <div>
                            <div 
                              className="font-medium cursor-pointer hover:text-primary transition-colors"
                              onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
                            >
                              {teacher.name}
                            </div>
                            <div className="text-sm text-muted-foreground">{teacher.email || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">{teacher.phone || '-'}</td>
                      <td className="hidden md:table-cell">{formatCurrency(teacher.rate_per_lesson)}</td>
                      <td>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(t)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedTeacher(t);
                              setIsResetPasswordDialogOpen(true);
                            }}>
                              <Key className="w-4 h-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isActive ? (
                              <DropdownMenuItem 
                                onClick={() => handleToggleActive(t, false)}
                                className="text-orange-600"
                              >
                                <UserX className="w-4 h-4 mr-2" /> Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleToggleActive(t, true)}
                                className="text-green-600"
                              >
                                <UserCheck className="w-4 h-4 mr-2" /> Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTeacher(t);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Teacher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Add New Teacher
            </DialogTitle>
            <DialogDescription>
              Create a new teacher account. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input 
                id="name"
                placeholder="John Smith"
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input 
                id="email"
                type="email"
                placeholder="teacher@academy.com"
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone"
                placeholder="+234 123 456 7890"
                value={formData.phone} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate per Lesson *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">D</span>
                <Input 
                  id="rate"
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="200"
                  className="pl-8"
                  value={formData.rate_per_lesson} 
                  onChange={(e) => setFormData({ ...formData, rate_per_lesson: e.target.value })} 
                  required 
                />
              </div>
            </div>
            {classes && classes.length > 0 && (
              <div className="space-y-2">
                <Label>Assign Classes (Optional)</Label>
                <Select
                  value={formData.class_ids[0] || ''}
                  onValueChange={(value) => setFormData({ ...formData, class_ids: value ? [value] : [] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.class_id} value={cls.class_id}>
                        {cls.name} {cls.schedule ? `(${cls.schedule})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Teacher Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" /> Edit Teacher
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeacher} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input 
                id="edit-name"
                value={editFormData.name} 
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input 
                id="edit-phone"
                value={editFormData.phone} 
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Rate per Lesson *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">D</span>
                <Input 
                  id="edit-rate"
                  type="number" 
                  step="0.01"
                  min="0"
                  className="pl-8"
                  value={editFormData.rate_per_lesson} 
                  onChange={(e) => setEditFormData({ ...editFormData, rate_per_lesson: e.target.value })} 
                  required 
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" /> Reset Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new temporary password for {selectedTeacher?.name}. 
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Teacher
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete <strong>{selectedTeacher?.name}</strong>?</p>
              <p className="text-sm">This will:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Remove teacher account permanently</li>
                <li>Unassign from all classes</li>
                <li>Keep historical lesson records (for audit trail)</li>
              </ul>
              <p className="text-sm font-medium text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTeacher} 
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Yes, Delete Teacher'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temporary Password Display Dialog */}
      <Dialog open={!!tempPasswordInfo} onOpenChange={() => setTempPasswordInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Mail className="w-5 h-5" /> Credentials Ready
            </DialogTitle>
            <DialogDescription>
              Share these login credentials with the teacher. They will be required to change the password on first login.
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