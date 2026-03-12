import { useState, useMemo } from 'react';
import { Plus, Download } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudents, useCreateStudent, useDeleteStudent } from '@/hooks/use-students';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { useStudentsBatchStats, useStudentsPaymentStats } from '@/hooks/use-students-batch-stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { exportStudents, type StudentExport } from '@/lib/excel-export';
import { EditStudentDialog } from '@/components/teacher/EditStudentDialog';
import { getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { StudentStatsCards } from '@/components/students/StudentStatsCards';
import { StudentFiltersBar } from '@/components/students/StudentFiltersBar';
import { StudentTableView } from '@/components/students/StudentTableView';
import { StudentCardView } from '@/components/students/StudentCardView';
import type { Student } from '@/hooks/use-students';

const STUDENT_LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'];
const PAGE_SIZE = 20;

export default function Students() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [sortField, setSortField] = useState('newest');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const { data: students, isLoading } = useStudents({ search, status: statusFilter || undefined, teacher_id: teacherFilter || undefined });
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const createStudent = useCreateStudent();
  const deleteStudentMutation = useDeleteStudent();

  // Date filter
  const dateFiltered = useMemo(() => {
    if (!students) return [];
    const { startDate, endDate } = getFilterDateRange(dateFilter);
    if (!startDate || !endDate) return students;
    return students.filter((s) => {
      const created = s.created_at?.slice(0, 10);
      return created && created >= startDate && created <= endDate;
    });
  }, [students, dateFilter]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...dateFiltered];
    switch (sortField) {
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'wallet-asc': return list.sort((a, b) => (a.wallet_balance || 0) - (b.wallet_balance || 0));
      case 'wallet-desc': return list.sort((a, b) => (b.wallet_balance || 0) - (a.wallet_balance || 0));
      case 'oldest': return list.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      case 'newest':
      default: return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }
  }, [dateFiltered, sortField]);

  // Pagination
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  // Batch stats for visible students
  const visibleIds = useMemo(() => paginatedStudents.map(s => s.student_id), [paginatedStudents]);
  const { data: batchStats } = useStudentsBatchStats(visibleIds);

  // Stats
  const totalStudents = dateFiltered.length;
  const activeCount = dateFiltered.filter(s => s.status === 'Active').length;
  const overdueCount = dateFiltered.filter(s => s.status === 'Active' && (s.wallet_balance || 0) <= 0).length;
  const tempStopCount = dateFiltered.filter(s => s.status === 'Temporary Stop').length;
  const leftCount = dateFiltered.filter(s => s.status === 'Left').length;
  const retentionRate = totalStudents > 0 ? Math.round((activeCount / totalStudents) * 100) : 0;

  // Reset page when filters change
  const handleFilterChange = (setter: (v: any) => void) => (v: any) => { setter(v); setPage(1); };

  // Form
  const [formData, setFormData] = useState({
    name: '', phone: '', parent_guardian_name: '', age: '', gender: '',
    nationality: '', school: '', year_group: '', program_id: '', student_level: '', teacher_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id) {
      toast({ title: 'Please select a teacher', variant: 'destructive' });
      return;
    }
    try {
      await createStudent.mutateAsync({
        name: formData.name, phone: formData.phone,
        parent_guardian_name: formData.parent_guardian_name || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined, nationality: formData.nationality || undefined,
        school: formData.school || undefined, year_group: formData.year_group || undefined,
        program_id: formData.program_id || undefined, student_level: formData.student_level || undefined,
        teacher_id: formData.teacher_id,
      });
      toast({ title: 'Student created successfully!' });
      setIsDialogOpen(false);
      setFormData({ name: '', phone: '', parent_guardian_name: '', age: '', gender: '', nationality: '', school: '', year_group: '', program_id: '', student_level: '', teacher_id: '' });
    } catch {
      toast({ title: 'Error creating student', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteStudent) return;
    try {
      await deleteStudentMutation.mutateAsync(deleteStudent.student_id);
      toast({ title: `${deleteStudent.name} has been deleted` });
      setDeleteStudent(null);
    } catch {
      toast({ title: 'Error deleting student', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">OAC Students</h1>
            <p className="text-muted-foreground">Manage your academy students</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              if (!dateFiltered.length) { toast({ title: 'No data to export', variant: 'destructive' }); return; }
              const exportData: StudentExport[] = dateFiltered.map(s => ({
                name: s.name, phone: s.phone, parent_phone: s.parent_phone,
                parent_guardian_name: s.parent_guardian_name, age: s.age, gender: s.gender,
                nationality: s.nationality, school: s.school, year_group: s.year_group,
                student_level: s.student_level, program_name: s.programs?.name || null,
                teacher_name: s.teachers?.name || null, status: s.status,
                wallet_balance: s.wallet_balance, total_paid: s.total_paid,
                number_of_renewals: s.number_of_renewals, created_at: s.created_at,
              }));
              exportStudents(exportData);
              toast({ title: 'Exported successfully!' });
            }}>
              <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Student</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Phone *</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Parent Name</Label><Input value={formData.parent_guardian_name} onChange={e => setFormData({ ...formData, parent_guardian_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Age</Label><Input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={v => setFormData({ ...formData, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nationality</Label><Input value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} /></div>
                    <div className="space-y-2"><Label>School</Label><Input value={formData.school} onChange={e => setFormData({ ...formData, school: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Year Group</Label><Input value={formData.year_group} onChange={e => setFormData({ ...formData, year_group: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Program</Label>
                      <Select value={formData.program_id} onValueChange={v => setFormData({ ...formData, program_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                        <SelectContent>{programs?.filter(p => p.is_active).map(p => <SelectItem key={p.program_id} value={p.program_id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Student Level</Label>
                    <Select value={formData.student_level} onValueChange={v => setFormData({ ...formData, student_level: v })}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>{STUDENT_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Assigned Teacher *</Label>
                    <Select value={formData.teacher_id} onValueChange={v => setFormData({ ...formData, teacher_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>{teachers?.filter(t => t.is_active).map(t => <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>)}</SelectContent>
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

        <StudentStatsCards total={totalStudents} active={activeCount} overdue={overdueCount} tempStop={tempStopCount} left={leftCount} retentionRate={retentionRate} />

        <StudentFiltersBar
          search={search} onSearchChange={handleFilterChange(setSearch)}
          teacherFilter={teacherFilter} onTeacherFilterChange={handleFilterChange(setTeacherFilter)}
          statusFilter={statusFilter} onStatusFilterChange={handleFilterChange(setStatusFilter)}
          dateFilter={dateFilter} onDateFilterChange={handleFilterChange(setDateFilter)}
          teachers={teachers} viewMode={viewMode} onViewModeChange={setViewMode}
          sortField={sortField} onSortFieldChange={setSortField}
        />

        {viewMode === 'table' ? (
          <StudentTableView
            students={paginatedStudents}
            batchStats={batchStats || {}}
            isLoading={isLoading}
            onEdit={setEditStudent}
            onDelete={setDeleteStudent}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={sorted.length}
            onPageChange={setPage}
          />
        ) : (
          <StudentCardView
            students={paginatedStudents}
            batchStats={batchStats || {}}
            onEdit={setEditStudent}
            onDelete={setDeleteStudent}
          />
        )}

        {/* Pagination for cards view */}
        {viewMode === 'cards' && Math.ceil(sorted.length / PAGE_SIZE) > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(sorted.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <EditStudentDialog student={editStudent} open={!!editStudent} onOpenChange={(open) => { if (!open) setEditStudent(null); }} />

      <AlertDialog open={!!deleteStudent} onOpenChange={(open) => { if (!open) setDeleteStudent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteStudent?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
