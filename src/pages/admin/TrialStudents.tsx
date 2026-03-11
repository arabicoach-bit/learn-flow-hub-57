import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Users, Loader2, Download } from 'lucide-react';
import { useTrialStudents, useUpdateTrialStudent, useDeleteTrialStudent, type TrialStudent } from '@/hooks/use-trial-students';
import { useTeachers } from '@/hooks/use-teachers';
import { AddTrialStudentForm } from '@/components/trial/AddTrialStudentForm';
import { TrialStudentCard } from '@/components/trial/TrialStudentCard';
import { TrialTableView } from '@/components/trial/TrialTableView';
import { TrialStatsCards } from '@/components/trial/TrialStatsCards';
import { TrialFiltersBar } from '@/components/trial/TrialFiltersBar';
import { type TrialSortOption } from '@/components/trial/TrialFiltersBar';
import { EditTrialStudentDialog } from '@/components/trial/EditTrialStudentDialog';
import { ConvertToStudentDialog } from '@/components/trial/ConvertToStudentDialog';
import { useToast } from '@/hooks/use-toast';
import { exportTrialStudents, type TrialStudentExport } from '@/lib/excel-export';
import { getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import type { Database } from '@/integrations/supabase/types';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];
type TrialConversionStatus = 'Pending' | 'Converted' | 'Lost';

export default function TrialStudents() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'all'>('all');
  const [conversionFilter, setConversionFilter] = useState<TrialConversionStatus | 'all'>('all');
  const [resultFilter, setResultFilter] = useState<TrialResult | 'all'>('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<TrialStudent | null>(null);
  const [convertingStudent, setConvertingStudent] = useState<TrialStudent | null>(null);
  const { toast } = useToast();

  const { data: teachers } = useTeachers();
  const { data: trialStudents, isLoading, refetch } = useTrialStudents({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });
  const updateTrialStudent = useUpdateTrialStudent();
  const deleteTrialStudent = useDeleteTrialStudent();

  const { startDate: filterStart, endDate: filterEnd } = getFilterDateRange(dateFilter);

  const filteredStudents = useMemo(() => {
    if (!trialStudents) return [];
    return trialStudents.filter(s => {
      if (filterStart && filterEnd) {
        const created = s.created_at?.slice(0, 10) || '';
        if (created < filterStart || created > filterEnd) return false;
      }
      if (teacherFilter !== 'all' && s.teacher_id !== teacherFilter) return false;
      if (conversionFilter !== 'all' && s.conversion_status !== conversionFilter) return false;
      if (resultFilter !== 'all' && s.trial_result !== resultFilter) return false;
      return true;
    });
  }, [trialStudents, filterStart, filterEnd, teacherFilter, conversionFilter, resultFilter]);

  const stats = {
    total: filteredStudents.length,
    scheduled: filteredStudents.filter(s => s.status === 'Scheduled').length,
    completed: filteredStudents.filter(s => s.status === 'Completed').length,
    absent: filteredStudents.filter(s => s.status === 'Absent').length,
    converted: filteredStudents.filter(s => s.conversion_status === 'Converted').length,
    pending: filteredStudents.filter(s => s.conversion_status === 'Pending').length,
    lost: filteredStudents.filter(s => s.conversion_status === 'Lost').length,
  };

  const conversionRate = (stats.converted + stats.lost) > 0
    ? ((stats.converted / (stats.converted + stats.lost)) * 100).toFixed(1)
    : '0.0';

  const handleUpdateStatus = async (trialId: string, status: TrialStatus) => {
    try {
      await updateTrialStudent.mutateAsync({ trial_id: trialId, status });
      toast({ title: 'Status updated', description: `Marked as ${status}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleUpdateResult = async (trialId: string, result: TrialResult) => {
    try {
      await updateTrialStudent.mutateAsync({ trial_id: trialId, trial_result: result });
      toast({ title: 'Result updated', description: `Set to ${result}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update result.', variant: 'destructive' });
    }
  };

  const handleUpdateConversion = async (trialId: string, conversion: TrialConversionStatus) => {
    try {
      await updateTrialStudent.mutateAsync({ trial_id: trialId, conversion_status: conversion } as any);
      toast({ title: 'Conversion updated', description: `Set to ${conversion}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update conversion.', variant: 'destructive' });
    }
  };

  const handleUpdateFollowUp = async (trialId: string, followUp: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateTrialStudent.mutateAsync({
        trial_id: trialId,
        follow_up: followUp || undefined,
        last_contact_date: followUp ? today : undefined,
      } as any);
      toast({ title: 'Follow-up updated', description: followUp ? `Follow-up set to ${followUp}.` : 'Follow-up cleared.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update follow-up.', variant: 'destructive' });
    }
  };

  const handleUpdateHandledBy = async (trialId: string, handledBy: string) => {
    try {
      await updateTrialStudent.mutateAsync({ trial_id: trialId, handled_by: handledBy || undefined });
      toast({ title: 'Updated', description: handledBy ? `Handled by set to ${handledBy}.` : 'Handled by cleared.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
    }
  };

  const handleDelete = async (trialId: string) => {
    if (!window.confirm('Are you sure you want to delete this trial student and all associated lesson records?')) return;
    try {
      await deleteTrialStudent.mutateAsync(trialId);
      toast({ title: 'Deleted', description: 'Trial student deleted.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    if (!filteredStudents.length) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const exportData: TrialStudentExport[] = filteredStudents.map(s => ({
      name: s.name, phone: s.phone, parent_guardian_name: s.parent_guardian_name,
      age: s.age, gender: s.gender, school: s.school, year_group: s.year_group,
      interested_program: s.interested_program, student_level: s.student_level,
      trial_date: s.trial_date, trial_time: s.trial_time, duration_minutes: s.duration_minutes,
      status: s.status, trial_result: s.trial_result, teacher_name: s.teachers?.name || null,
      notes: s.notes, follow_up_notes: s.follow_up_notes, created_at: s.created_at,
    }));
    exportTrialStudents(exportData);
    toast({ title: 'Exported successfully!' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Trial Students</h1>
            <p className="text-muted-foreground">
              Manage trial lesson students with 30-minute sessions and 50/50 payment split
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Export Excel
            </Button>
            <Button onClick={() => setIsAddFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Trial Student
            </Button>
          </div>
        </div>

        {/* Stats */}
        <TrialStatsCards stats={stats} conversionRate={conversionRate} />

        {/* Filters */}
        <TrialFiltersBar
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          conversionFilter={conversionFilter} onConversionChange={setConversionFilter}
          resultFilter={resultFilter} onResultChange={setResultFilter}
          teacherFilter={teacherFilter} onTeacherChange={setTeacherFilter}
          dateFilter={dateFilter} onDateChange={setDateFilter}
          viewMode={viewMode} onViewModeChange={setViewMode}
          teachers={teachers}
        />

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length > 0 ? (
          viewMode === 'table' ? (
            <TrialTableView
              students={filteredStudents}
              onUpdateStatus={handleUpdateStatus}
              onUpdateConversion={handleUpdateConversion}
              onUpdateResult={handleUpdateResult}
              onUpdateFollowUp={handleUpdateFollowUp}
              onUpdateHandledBy={handleUpdateHandledBy}
              onEdit={setEditingStudent}
              onConvert={setConvertingStudent}
              onDelete={handleDelete}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => (
                <TrialStudentCard
                  key={student.trial_id}
                  student={student}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateConversion={handleUpdateConversion}
                  onUpdateResult={handleUpdateResult}
                  onEdit={setEditingStudent}
                  onConvert={setConvertingStudent}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
        ) : (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trial students found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search || statusFilter !== 'all' || conversionFilter !== 'all' || resultFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first trial student to get started'}
              </p>
            </CardContent>
          </Card>
        )}

        <AddTrialStudentForm open={isAddFormOpen} onOpenChange={setIsAddFormOpen} />
        <EditTrialStudentDialog student={editingStudent} open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)} />
        <ConvertToStudentDialog trialStudent={convertingStudent} open={!!convertingStudent} onOpenChange={(open) => !open && setConvertingStudent(null)} onSuccess={() => refetch()} />
      </div>
    </AdminLayout>
  );
}
