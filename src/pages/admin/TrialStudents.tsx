import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  UserCheck,
  Loader2,
  Download,
  TrendingUp,
  MoreVertical,
  UserPlus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useTrialStudents, useUpdateTrialStudent, useDeleteTrialStudent, type TrialStudent } from '@/hooks/use-trial-students';
import { useTeachers } from '@/hooks/use-teachers';
import { AddTrialStudentForm } from '@/components/trial/AddTrialStudentForm';
import { TrialStudentCard } from '@/components/trial/TrialStudentCard';
import { EditTrialStudentDialog } from '@/components/trial/EditTrialStudentDialog';
import { ConvertToStudentDialog } from '@/components/trial/ConvertToStudentDialog';
import { useToast } from '@/hooks/use-toast';
import { exportTrialStudents, type TrialStudentExport } from '@/lib/excel-export';
import type { Database } from '@/integrations/supabase/types';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];
type TrialConversionStatus = 'Pending' | 'Converted' | 'Lost';

export default function TrialStudents() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'all'>('all');
  const [conversionFilter, setConversionFilter] = useState<TrialConversionStatus | 'all'>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<TrialStudent | null>(null);
  const [convertingStudent, setConvertingStudent] = useState<TrialStudent | null>(null);
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const { data: teachers } = useTeachers();

  const { data: trialStudents, isLoading, refetch } = useTrialStudents({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const updateTrialStudent = useUpdateTrialStudent();
  const deleteTrialStudent = useDeleteTrialStudent();

  const handleUpdateStatus = async (trialId: string, status: TrialStatus) => {
    try {
      await updateTrialStudent.mutateAsync({ trial_id: trialId, status });
      toast({
        title: 'Status updated',
        description: `Trial student marked as ${status}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateResult = async (trialId: string, result: TrialResult) => {
    try {
      await updateTrialStudent.mutateAsync({ trial_id: trialId, trial_result: result });
      toast({ title: 'Result updated', description: `Trial result set to ${result}.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update result.', variant: 'destructive' });
    }
  };

  const handleUpdateConversion = async (trialId: string, conversion: TrialConversionStatus) => {
    try {
      await updateTrialStudent.mutateAsync({ trial_id: trialId, conversion_status: conversion } as any);
      toast({ title: 'Conversion updated', description: `Conversion status set to ${conversion}.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update conversion status.', variant: 'destructive' });
    }
  };

  const handleEdit = (student: TrialStudent) => {
    setEditingStudent(student);
  };

  const handleConvert = (student: TrialStudent) => {
    setConvertingStudent(student);
  };

  const handleConversionSuccess = () => {
    refetch();
  };

  const handleDelete = async (trialId: string) => {
    if (!window.confirm('Are you sure you want to delete this trial student and all associated lesson records?')) return;
    try {
      await deleteTrialStudent.mutateAsync(trialId);
      toast({
        title: 'Deleted',
        description: 'Trial student and associated records deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete trial student.',
        variant: 'destructive',
      });
    }
  };

  // Filter by date
  const { startDate: filterStart, endDate: filterEnd } = getFilterDateRange(dateFilter);

  const filteredTrialStudents = useMemo(() => {
    if (!trialStudents) return [];
    return trialStudents.filter(s => {
      if (filterStart && filterEnd) {
        const created = s.created_at?.slice(0, 10) || '';
        if (created < filterStart || created > filterEnd) return false;
      }
      if (teacherFilter !== 'all' && s.teacher_id !== teacherFilter) return false;
      if (conversionFilter !== 'all' && s.conversion_status !== conversionFilter) return false;
      return true;
    });
  }, [trialStudents, filterStart, filterEnd, teacherFilter, conversionFilter]);

  // Stats based on filtered data
  const stats = {
    total: filteredTrialStudents.length,
    scheduled: filteredTrialStudents.filter(s => s.status === 'Scheduled').length,
    completed: filteredTrialStudents.filter(s => s.status === 'Completed').length,
    absent: filteredTrialStudents.filter(s => s.status === 'Absent').length,
    converted: filteredTrialStudents.filter(s => s.conversion_status === 'Converted').length,
    pending: filteredTrialStudents.filter(s => s.conversion_status === 'Pending').length,
    lost: filteredTrialStudents.filter(s => s.conversion_status === 'Lost').length,
  };

  const conversionRate = (stats.converted + stats.lost) > 0
    ? ((stats.converted / (stats.converted + stats.lost)) * 100).toFixed(1)
    : '0.0';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Trial Students</h1>
            <p className="text-muted-foreground">
              Manage trial lesson students with 30-minute sessions and 50/50 payment split
            </p>
          </div>
          <div className="flex gap-2">
            <YearMonthFilter value={dateFilter} onChange={setDateFilter} />
            <Button
              variant="outline"
              onClick={() => {
                if (!trialStudents || trialStudents.length === 0) {
                  toast({ title: 'No data to export', variant: 'destructive' });
                  return;
                }
                const exportData: TrialStudentExport[] = trialStudents.map(s => ({
                  name: s.name,
                  phone: s.phone,
                  parent_guardian_name: s.parent_guardian_name,
                  age: s.age,
                  gender: s.gender,
                  school: s.school,
                  year_group: s.year_group,
                  interested_program: s.interested_program,
                  student_level: s.student_level,
                  trial_date: s.trial_date,
                  trial_time: s.trial_time,
                  duration_minutes: s.duration_minutes,
                  status: s.status,
                  trial_result: s.trial_result,
                  teacher_name: s.teachers?.name || null,
                  notes: s.notes,
                  follow_up_notes: s.follow_up_notes,
                  created_at: s.created_at,
                }));
                exportTrialStudents(exportData);
                toast({ title: 'Exported successfully!' });
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => setIsAddFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Trial Student
            </Button>
          </div>
        </div>

        {/* Stats Cards - Attendance */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Attendance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Total Trials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Scheduled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-2xl font-bold">{stats.scheduled}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-2xl font-bold">{stats.completed}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Absent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-400" />
                  <span className="text-2xl font-bold">{stats.absent}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards - Conversion */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Conversion</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="text-2xl font-bold">{stats.pending}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Converted</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-2xl font-bold">{stats.converted}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Lost</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-2xl font-bold">{stats.lost}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Conversion Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{conversionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TrialStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Attendance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Attendance</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Absent">Absent</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={conversionFilter}
            onValueChange={(v) => setConversionFilter(v as TrialConversionStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Conversion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conversion</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Converted">Converted</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={teacherFilter}
            onValueChange={setTeacherFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers?.filter(t => t.is_active).map(t => (
                <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTrialStudents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrialStudents.map((student) => (
              <TrialStudentCard
                key={student.trial_id}
                student={student}
                onUpdateStatus={handleUpdateStatus}
                onUpdateConversion={handleUpdateConversion}
                onUpdateResult={handleUpdateResult}
                onEdit={handleEdit}
                onConvert={handleConvert}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trial students found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Add your first trial student to get started'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button onClick={() => setIsAddFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Trial Student
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Form Dialog */}
        <AddTrialStudentForm
          open={isAddFormOpen}
          onOpenChange={setIsAddFormOpen}
        />

        {/* Edit Dialog */}
        <EditTrialStudentDialog
          student={editingStudent}
          open={!!editingStudent}
          onOpenChange={(open) => !open && setEditingStudent(null)}
        />

        {/* Convert to Student Dialog */}
        <ConvertToStudentDialog
          trialStudent={convertingStudent}
          open={!!convertingStudent}
          onOpenChange={(open) => !open && setConvertingStudent(null)}
          onSuccess={handleConversionSuccess}
        />
      </div>
    </AdminLayout>
  );
}
