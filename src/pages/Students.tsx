import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Pencil, Trash2, Users, UserCheck, AlertTriangle, PauseCircle } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from '@/hooks/use-students';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWalletColor, getStatusBadgeClass, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { exportStudents, type StudentExport } from '@/lib/excel-export';
import { EditStudentDialog } from '@/components/teacher/EditStudentDialog';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { LessonsCell } from '@/components/students/LessonsCell';
import { NextLessonCell } from '@/components/students/NextLessonCell';
import type { Student } from '@/hooks/use-students';

export default function Students() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [teacherFilter, setTeacherFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const { data: students, isLoading } = useStudents({ search, status: statusFilter || undefined, teacher_id: teacherFilter || undefined });
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  const STUDENT_LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'];

  // Apply date filter on created_at
  const filteredStudents = (() => {
    if (!students) return [];
    const { startDate, endDate } = getFilterDateRange(dateFilter);
    if (!startDate || !endDate) return students;
    return students.filter((s) => {
      const created = s.created_at?.slice(0, 10);
      return created && created >= startDate && created <= endDate;
    });
  })();

  const totalStudents = filteredStudents.length;
  const activeCount = filteredStudents.filter(s => s.status === 'Active').length;
  const overdueCount = filteredStudents.filter(s => s.status === 'Active' && (s.wallet_balance || 0) <= 0).length;
  const tempStopCount = filteredStudents.filter(s => s.status === 'Temporary Stop').length;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    parent_guardian_name: '',
    age: '',
    gender: '',
    nationality: '',
    school: '',
    year_group: '',
    program_id: '',
    student_level: '',
    teacher_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teacher_id) {
      toast({ title: 'Please select a teacher', variant: 'destructive' });
      return;
    }
    
    try {
      await createStudent.mutateAsync({
        name: formData.name,
        phone: formData.phone,
        parent_guardian_name: formData.parent_guardian_name || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
        nationality: formData.nationality || undefined,
        school: formData.school || undefined,
        year_group: formData.year_group || undefined,
        program_id: formData.program_id || undefined,
        student_level: formData.student_level || undefined,
        teacher_id: formData.teacher_id,
      });
      toast({ title: 'Student created successfully!' });
      setIsDialogOpen(false);
      setFormData({ 
        name: '', phone: '', parent_guardian_name: '', age: '', gender: '',
        nationality: '', school: '', year_group: '', program_id: '', student_level: '', teacher_id: '' 
      });
    } catch (error) {
      toast({ title: 'Error creating student', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteStudent) return;
    try {
      await deleteStudentMutation.mutateAsync(deleteStudent.student_id);
      toast({ title: `${deleteStudent.name} has been deleted` });
      setDeleteStudent(null);
    } catch (error) {
      toast({ title: 'Error deleting student', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">OAC Students</h1>
            <p className="text-muted-foreground">Manage your academy students</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!filteredStudents || filteredStudents.length === 0) {
                  toast({ title: 'No data to export', variant: 'destructive' });
                  return;
                }
                const exportData: StudentExport[] = filteredStudents.map(s => ({
                  name: s.name,
                  phone: s.phone,
                  parent_phone: s.parent_phone,
                  parent_guardian_name: s.parent_guardian_name,
                  age: s.age,
                  gender: s.gender,
                  nationality: s.nationality,
                  school: s.school,
                  year_group: s.year_group,
                  student_level: s.student_level,
                  program_name: s.programs?.name || null,
                  teacher_name: s.teachers?.name || null,
                  status: s.status,
                  wallet_balance: s.wallet_balance,
                  total_paid: s.total_paid,
                  number_of_renewals: s.number_of_renewals,
                  created_at: s.created_at,
                }));
                exportStudents(exportData);
                toast({ title: 'Exported successfully!' });
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Add Student
                </Button>
              </DialogTrigger>
             <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Parent Name</Label>
                  <Input value={formData.parent_guardian_name} onChange={(e) => setFormData({ ...formData, parent_guardian_name: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>School</Label>
                    <Input value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Year Group</Label>
                    <Input value={formData.year_group} onChange={(e) => setFormData({ ...formData, year_group: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Program</Label>
                    <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>
                        {programs?.filter(p => p.is_active).map((program) => (
                          <SelectItem key={program.program_id} value={program.program_id}>{program.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Student Level</Label>
                  <Select value={formData.student_level} onValueChange={(v) => setFormData({ ...formData, student_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {STUDENT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Teacher *</Label>
                  <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers?.filter(t => t.is_active).map((t) => <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={createStudent.isPending}>
                  {createStudent.isPending ? 'Creating...' : 'Create Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-xl font-bold">{totalStudents}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <div className="text-xl font-bold text-emerald-600">{activeCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-xl font-bold text-red-600">{overdueCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <PauseCircle className="h-4 w-4 text-amber-600" />
              <div className="text-xl font-bold text-amber-600">{tempStopCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Temporary Stop</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={teacherFilter || 'all'} onValueChange={(v) => setTeacherFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Teachers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers?.map((t) => (
                <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Temporary Stop">Temporary Stop</SelectItem>
            <SelectItem value="Left">Left</SelectItem>
            </SelectContent>
          </Select>
          <YearMonthFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Teacher</th>
                <th>Wallet</th>
                <th>Lessons</th>
                <th>Next Lesson</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8}><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">No students found</td>
                </tr>
              ) : (
              filteredStudents.map((student) => {
                  const wallet = student.wallet_balance || 0;
                  const isOverdue = wallet <= 0;

                  return (
                    <tr 
                      key={student.student_id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/students/${student.student_id}`)}
                    >
                      <td>
                        <span className="text-xs text-muted-foreground font-mono">
                          {student.student_id.slice(0, 8)}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className="font-medium">{student.name}</span>
                          {student.created_at && (
                            <p className="text-xs text-muted-foreground">
                              Joined {format(new Date(student.created_at), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>{student.teachers?.name || '-'}</td>
                      <td>
                        <span 
                          className={`font-bold px-2 py-0.5 rounded ${getWalletColor(student.wallet_balance)}`}
                          style={{ 
                            backgroundColor: wallet >= 5 ? 'rgb(16 185 129 / 0.15)' :
                                            wallet >= 3 ? 'rgb(132 204 22 / 0.15)' :
                                            wallet >= 1 ? 'rgb(245 158 11 / 0.15)' :
                                            wallet === 0 ? 'rgb(249 115 22 / 0.15)' :
                                            wallet >= -2 ? 'rgb(239 68 68 / 0.15)' :
                                            'rgb(127 29 29 / 0.15)'
                          }}
                        >
                          {student.wallet_balance}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <LessonsCell studentId={student.student_id} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <NextLessonCell studentId={student.student_id} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                        <Select
                          value={student.status}
                          onValueChange={(value: 'Active' | 'Temporary Stop' | 'Left') => {
                            updateStudent.mutate(
                              { studentId: student.student_id, status: value },
                              {
                                onSuccess: () => toast({ title: `Status updated to ${getStatusDisplayLabel(value)}` }),
                                onError: () => toast({ title: 'Failed to update status', variant: 'destructive' }),
                              }
                            );
                          }}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">
                              <Badge variant="outline" className={getStatusBadgeClass('Active')}>Active</Badge>
                            </SelectItem>
                            <SelectItem value="Temporary Stop">
                              <Badge variant="outline" className={getStatusBadgeClass('Temporary Stop')}>{getStatusDisplayLabel('Temporary Stop')}</Badge>
                            </SelectItem>
                            <SelectItem value="Left">
                              <Badge variant="outline" className={getStatusBadgeClass('Left')}>{getStatusDisplayLabel('Left')}</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {isOverdue && student.status === 'Active' && (
                          <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30 text-xs">
                            Overdue
                          </Badge>
                        )}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditStudent(student)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteStudent(student)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Dialog */}
      <EditStudentDialog
        student={editStudent}
        open={!!editStudent}
        onOpenChange={(open) => { if (!open) setEditStudent(null); }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStudent} onOpenChange={(open) => { if (!open) setDeleteStudent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteStudent?.name}</strong>? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
