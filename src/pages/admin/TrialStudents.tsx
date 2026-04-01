import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Loader2, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTrialStudents, useUpdateTrialStudent, useDeleteTrialStudent, type TrialStudent } from '@/hooks/use-trial-students';
import { useTeachers } from '@/hooks/use-teachers';
import { AddTrialStudentForm } from '@/components/trial/AddTrialStudentForm';
import { TrialStudentCard } from '@/components/trial/TrialStudentCard';
import { TrialTableView } from '@/components/trial/TrialTableView';
import { TrialStatsBar } from '@/components/trial/TrialStatsBar';
import { TrialFiltersBar } from '@/components/trial/TrialFiltersBar';
import { type TrialSortOption } from '@/components/trial/TrialFiltersBar';
import { EditTrialStudentDialog } from '@/components/trial/EditTrialStudentDialog';
import { ConvertToStudentDialog } from '@/components/trial/ConvertToStudentDialog';
import { useToast } from '@/hooks/use-toast';
import { exportTrialStudents, type TrialStudentExport } from '@/lib/excel-export';
import { getCurrentQuarter, getQuarterDateRange, type QuarterFilterValue } from '@/components/shared/QuarterFilter';
import type { Database } from '@/integrations/supabase/types';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];
type TrialConversionStatus = 'Pending' | 'Converted' | 'Lost';

type TabValue = 'all' | 'pending' | 'completed' | 'converted' | 'lost';

export default function TrialStudents() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'all'>('all');
  const [conversionFilter, setConversionFilter] = useState<TrialConversionStatus | 'all'>('all');
  const [resultFilter, setResultFilter] = useState<TrialResult | 'all'>('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<QuarterFilterValue>(getCurrentQuarter());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortBy, setSortBy] = useState<TrialSortOption>('newest');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<TrialStudent | null>(null);
  const [convertingStudent, setConvertingStudent] = useState<TrialStudent | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const { toast } = useToast();

  const { data: teachers } = useTeachers();
  const { data: trialStudents, isLoading, refetch } = useTrialStudents({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });
  const updateTrialStudent = useUpdateTrialStudent();
  const deleteTrialStudent = useDeleteTrialStudent();

  const { startDate: filterStart, endDate: filterEnd } = getFilterDateRange(dateFilter);

  const baseFiltered = useMemo(() => {
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
    }).sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return (a.created_at || '').localeCompare(b.created_at || '');
        case 'alpha_asc': return (a.name || '').localeCompare(b.name || '');
        case 'alpha_desc': return (b.name || '').localeCompare(a.name || '');
        case 'trial_date': return (a.trial_date || '9999').localeCompare(b.trial_date || '9999');
        case 'last_contact': return (b.last_contact_date || '').localeCompare(a.last_contact_date || '');
        case 'newest': default: return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
  }, [trialStudents, filterStart, filterEnd, teacherFilter, conversionFilter, resultFilter, sortBy]);

  // Tab-filtered list
  const filteredStudents = useMemo(() => {
    if (activeTab === 'all') return baseFiltered;
    if (activeTab === 'pending') return baseFiltered.filter(s => s.conversion_status === 'Pending');
    if (activeTab === 'completed') return baseFiltered.filter(s => s.status === 'Completed' && s.conversion_status === 'Pending');
    if (activeTab === 'converted') return baseFiltered.filter(s => s.conversion_status === 'Converted');
    if (activeTab === 'lost') return baseFiltered.filter(s => s.conversion_status === 'Lost');
    return baseFiltered;
  }, [baseFiltered, activeTab]);

  // Stats based on baseFiltered (not tab-filtered)
  const stats = {
    total: baseFiltered.length,
    scheduled: baseFiltered.filter(s => s.status === 'Scheduled').length,
    completed: baseFiltered.filter(s => s.status === 'Completed').length,
    absent: baseFiltered.filter(s => s.status === 'Absent').length,
    converted: baseFiltered.filter(s => s.conversion_status === 'Converted').length,
    pending: baseFiltered.filter(s => s.conversion_status === 'Pending').length,
    lost: baseFiltered.filter(s => s.conversion_status === 'Lost').length,
  };

  const tabCounts = {
    all: baseFiltered.length,
    pending: stats.pending,
    completed: baseFiltered.filter(s => s.status === 'Completed' && s.conversion_status === 'Pending').length,
    converted: stats.converted,
    lost: stats.lost,
  };

  const conversionRate = stats.completed > 0
    ? ((stats.converted / stats.completed) * 100).toFixed(1)
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

  const renderContent = (students: TrialStudent[]) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (students.length === 0) {
      return (
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
      );
    }

    if (viewMode === 'table') {
      return (
        <TrialTableView
          students={students}
          onUpdateStatus={handleUpdateStatus}
          onUpdateConversion={handleUpdateConversion}
          onUpdateResult={handleUpdateResult}
          onUpdateFollowUp={handleUpdateFollowUp}
          onUpdateHandledBy={handleUpdateHandledBy}
          onEdit={setEditingStudent}
          onConvert={setConvertingStudent}
          onDelete={handleDelete}
        />
      );
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(student => (
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
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Trial Students</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" />Export
            </Button>
            <Button size="sm" onClick={() => setIsAddFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Add Trial
            </Button>
          </div>
        </div>

        {/* Compact Stats */}
        <TrialStatsBar stats={stats} conversionRate={conversionRate} />

        {/* Filters */}
        <TrialFiltersBar
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          conversionFilter={conversionFilter} onConversionChange={setConversionFilter}
          resultFilter={resultFilter} onResultChange={setResultFilter}
          teacherFilter={teacherFilter} onTeacherChange={setTeacherFilter}
          dateFilter={dateFilter} onDateChange={setDateFilter}
          sortBy={sortBy} onSortChange={setSortBy}
          viewMode={viewMode} onViewModeChange={setViewMode}
          teachers={teachers}
        />

        {/* Tabs + Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="bg-muted/50 h-9">
            <TabsTrigger value="all" className="text-xs h-7 px-3">
              All <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{tabCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs h-7 px-3">
              Pending <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-400">{tabCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs h-7 px-3">
              Awaiting <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-400">{tabCounts.completed}</Badge>
            </TabsTrigger>
            <TabsTrigger value="converted" className="text-xs h-7 px-3">
              Converted <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-400">{tabCounts.converted}</Badge>
            </TabsTrigger>
            <TabsTrigger value="lost" className="text-xs h-7 px-3">
              Lost <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400">{tabCounts.lost}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            {renderContent(filteredStudents)}
          </TabsContent>
        </Tabs>

        <AddTrialStudentForm open={isAddFormOpen} onOpenChange={setIsAddFormOpen} />
        <EditTrialStudentDialog student={editingStudent} open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)} />
        <ConvertToStudentDialog trialStudent={convertingStudent} open={!!convertingStudent} onOpenChange={(open) => !open && setConvertingStudent(null)} onSuccess={() => refetch()} />
      </div>
    </AdminLayout>
  );
}
