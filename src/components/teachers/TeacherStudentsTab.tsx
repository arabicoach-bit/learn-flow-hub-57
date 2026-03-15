import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, UserCheck, PauseCircle, UserX, Users, TrendingUp,
  ChevronRight, Pencil, Eye, MessageCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { YearMonthFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { EditStudentDialog } from '@/components/teacher/EditStudentDialog';
import { Student, useUpdateStudent } from '@/hooks/use-students';
import { usePrograms } from '@/hooks/use-programs';
import { getWalletColor, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { toast as sonnerToast } from 'sonner';

interface TeacherStudentsTabProps {
  students: Student[];
}

function whatsappUrl(phone: string | null | undefined) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${cleaned.replace(/^\+/, '')}`;
}

export function TeacherStudentsTab({ students }: TeacherStudentsTabProps) {
  const navigate = useNavigate();
  const { data: programs } = usePrograms();
  const updateStudent = useUpdateStudent();

  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');
  const [studentFilter, setStudentFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const studentRange = getFilterDateRange(studentFilter);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.phone.includes(studentSearch);
      const matchesStatus = studentStatusFilter === 'all' || s.status === studentStatusFilter;
      const createdAt = s.created_at ? new Date(s.created_at) : null;
      const matchesDate =
        !createdAt ||
        ((!studentRange.startDate || createdAt >= new Date(studentRange.startDate)) &&
          (!studentRange.endDate || createdAt <= new Date(studentRange.endDate + 'T23:59:59')));
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [students, studentSearch, studentStatusFilter, studentRange.startDate, studentRange.endDate]);

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'Active').length;
  const tempStopStudents = students.filter((s) => s.status === 'Temporary Stop').length;
  const leftStudents = students.filter((s) => s.status === 'Left').length;
  const retentionRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

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
    return programs?.find((p) => p.program_id === programId)?.name || '-';
  };

  const statsCards = [
    { label: 'Total', value: totalStudents, icon: Users, color: 'text-primary' },
    { label: 'Active', value: activeStudents, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Temp Stop', value: tempStopStudents, icon: PauseCircle, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Left', value: leftStudents, icon: UserX, color: 'text-destructive' },
    { label: 'Retention', value: `${retentionRate}%`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
          <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
          Student Statistics
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {statsCards.map((c) => (
              <Card key={c.label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <c.icon className={`w-4 h-4 ${c.color}`} />
                    <div>
                      <p className="text-xl font-bold">{c.value}</p>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="pl-10"
          />
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
        <YearMonthFilter value={studentFilter} onChange={setStudentFilter} />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Student</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Program</TableHead>
              <TableHead className="hidden md:table-cell">Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Wallet</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => {
                const wa = whatsappUrl(student.parent_phone || student.phone);
                return (
                  <TableRow
                    key={student.student_id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/admin/students/${student.student_id}`)}
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{student.name}</p>
                        {student.parent_guardian_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            Parent: {student.parent_guardian_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{student.phone}</span>
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-500 hover:text-emerald-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {getProgramName(student.program_id)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {student.student_level || '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={student.status || 'Active'}
                        onValueChange={(v) => handleStudentStatusChange(student, v as any)}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <Badge
                            variant="outline"
                            className={
                              student.status === 'Active'
                                ? 'status-active border-0'
                                : student.status === 'Temporary Stop'
                                  ? 'status-grace border-0'
                                  : 'status-blocked border-0'
                            }
                          >
                            {getStatusDisplayLabel(student.status)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">✅ Active</SelectItem>
                          <SelectItem value="Temporary Stop">⏸️ Temp Stop</SelectItem>
                          <SelectItem value="Left">❌ Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${getWalletColor(student.wallet_balance || 0)}`}>
                        {student.wallet_balance || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <TooltipProvider>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingStudent(student)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Student</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => navigate(`/admin/students/${student.student_id}`)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Student</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Student Dialog */}
      <EditStudentDialog
        student={editingStudent}
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      />
    </div>
  );
}
