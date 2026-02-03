import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  UserCheck,
  Loader2,
  Download
} from 'lucide-react';
import { useTrialStudents, useUpdateTrialStudent, type TrialStudent } from '@/hooks/use-trial-students';
import { AddTrialStudentForm } from '@/components/trial/AddTrialStudentForm';
import { TrialStudentCard } from '@/components/trial/TrialStudentCard';
import { EditTrialStudentDialog } from '@/components/trial/EditTrialStudentDialog';
import { ConvertToStudentDialog } from '@/components/trial/ConvertToStudentDialog';
import { useToast } from '@/hooks/use-toast';
import { exportTrialStudents, type TrialStudentExport } from '@/lib/excel-export';
import type { Database } from '@/integrations/supabase/types';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];

export default function TrialStudents() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'all'>('all');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<TrialStudent | null>(null);
  const [convertingStudent, setConvertingStudent] = useState<TrialStudent | null>(null);
  const { toast } = useToast();

  const { data: trialStudents, isLoading, refetch } = useTrialStudents({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const updateTrialStudent = useUpdateTrialStudent();

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
      toast({
        title: 'Result updated',
        description: `Trial result set to ${result}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update result.',
        variant: 'destructive',
      });
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

  // Stats
  const stats = {
    total: trialStudents?.length || 0,
    scheduled: trialStudents?.filter(s => s.status === 'Scheduled').length || 0,
    completed: trialStudents?.filter(s => s.status === 'Completed').length || 0,
    converted: trialStudents?.filter(s => s.status === 'Converted').length || 0,
    lost: trialStudents?.filter(s => s.status === 'Lost').length || 0,
  };

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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Converted">Converted</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : trialStudents && trialStudents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trialStudents.map((student) => (
              <TrialStudentCard
                key={student.trial_id}
                student={student}
                onUpdateStatus={handleUpdateStatus}
                onUpdateResult={handleUpdateResult}
                onEdit={handleEdit}
                onConvert={handleConvert}
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
