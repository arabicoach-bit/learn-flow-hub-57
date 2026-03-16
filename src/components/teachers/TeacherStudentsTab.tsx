import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, UserCheck, PauseCircle, UserX, Users, TrendingUp, AlertTriangle,
  ChevronRight, ChevronDown, Pencil, Eye, MessageCircle, Phone, BookOpen,
  LayoutGrid, TableIcon, Calendar, CalendarDays, Clock, User, ArrowUpDown, GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { YearMonthFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { EditStudentDialog } from '@/components/teacher/EditStudentDialog';
import { StudentLessonsView } from '@/components/student/StudentLessonsView';
import { StudentInfoView } from '@/components/student/StudentInfoView';
import { Student, useUpdateStudent } from '@/hooks/use-students';
import { usePrograms } from '@/hooks/use-programs';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { getWalletColor, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';

interface TeacherStudentsTabProps {
  students: Student[];
  teacherId?: string;
}

function whatsappUrl(phone: string | null | undefined) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${cleaned.replace(/^\+/, '')}`;
}

function ProgressRing({ value, size = 56, stroke = 4, color }: { value: number; size?: number; stroke?: number; color: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

type SortField = 'name' | 'status' | 'wallet' | 'nextLesson';
type SortDir = 'asc' | 'desc';

const formatTime12 = (time: string) => {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export function TeacherStudentsTab({ students, teacherId }: TeacherStudentsTabProps) {
  const navigate = useNavigate();
  const { data: programs } = usePrograms();
  const updateStudent = useUpdateStudent();
  const { data: allLessons } = useScheduledLessons({ teacher_id: teacherId });

  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');
  const [studentFilter, setStudentFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const studentRange = getFilterDateRange(studentFilter);

  const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Batch-fetch weekly schedules for all active packages
  const activePackageIds = useMemo(() => {
    return students.filter(s => s.current_package_id).map(s => s.current_package_id!);
  }, [students]);

  const { data: scheduleMap } = useQuery({
    queryKey: ['admin-teacher-student-schedules', teacherId, activePackageIds.sort().join(',')],
    queryFn: async () => {
      if (activePackageIds.length === 0) return new Map<string, { day: number; time: string }[]>();
      const { data } = await supabase
        .from('lesson_schedules')
        .select('package_id, day_of_week, time_slot')
        .in('package_id', activePackageIds)
        .order('day_of_week');
      
      const pkgToStudent = new Map<string, string>();
      students.forEach(s => {
        if (s.current_package_id) pkgToStudent.set(s.current_package_id, s.student_id);
      });
      
      const result = new Map<string, { day: number; time: string }[]>();
      (data || []).forEach(row => {
        const studentId = pkgToStudent.get(row.package_id!);
        if (!studentId) return;
        if (!result.has(studentId)) result.set(studentId, []);
        result.get(studentId)!.push({ day: row.day_of_week, time: row.time_slot });
      });
      return result;
    },
    enabled: activePackageIds.length > 0,
    staleTime: 60_000,
  });

  // Lesson stats per student (active package only)
  const lessonStatsMap = useMemo(() => {
    const map = new Map<string, { used: number; total: number }>();
    if (!allLessons) return map;
    const activePackageIds = new Set<string>();
    students.forEach(s => { if (s.current_package_id) activePackageIds.add(s.current_package_id); });
    allLessons.forEach(l => {
      if (!l.student_id || !l.package_id || !activePackageIds.has(l.package_id)) return;
      if (!map.has(l.student_id)) map.set(l.student_id, { used: 0, total: 0 });
      const entry = map.get(l.student_id)!;
      entry.total++;
      if (l.status === 'completed' || l.status === 'absent') entry.used++;
    });
    return map;
  }, [allLessons, students]);

  // Next lesson per student
  const nextLessonMap = useMemo(() => {
    const map = new Map<string, { date: string; time: string }>();
    if (!allLessons) return map;
    const today = format(new Date(), 'yyyy-MM-dd');
    const upcoming = allLessons
      .filter(l => l.status === 'scheduled' && l.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.scheduled_time.localeCompare(b.scheduled_time));
    upcoming.forEach(l => {
      if (l.student_id && !map.has(l.student_id)) {
        map.set(l.student_id, { date: l.scheduled_date, time: l.scheduled_time });
      }
    });
    return map;
  }, [allLessons]);

  const filteredStudents = useMemo(() => {
    let results = students.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.phone.includes(studentSearch);
      const matchesStatus = studentStatusFilter === 'all' || s.status === studentStatusFilter;
      const createdAt = s.created_at ? new Date(s.created_at) : null;
      const matchesDate = !createdAt || (
        (!studentRange.startDate || createdAt >= new Date(studentRange.startDate)) &&
        (!studentRange.endDate || createdAt <= new Date(studentRange.endDate + 'T23:59:59'))
      );
      return matchesSearch && matchesStatus && matchesDate;
    });

    const statusOrder = (s: string | null) => s === 'Active' ? 0 : s === 'Temporary Stop' ? 1 : 2;

    results.sort((a, b) => {
      const statusCmp = statusOrder(a.status) - statusOrder(b.status);
      if (statusCmp !== 0) return statusCmp;
      if (a.status === 'Active') {
        const aLow = (a.wallet_balance || 0) <= 2 ? 0 : 1;
        const bLow = (b.wallet_balance || 0) <= 2 ? 0 : 1;
        if (aLow !== bLow) return aLow - bLow;
      }
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'wallet') cmp = (a.wallet_balance || 0) - (b.wallet_balance || 0);
      else if (sortField === 'nextLesson') {
        const na = nextLessonMap.get(a.student_id);
        const nb = nextLessonMap.get(b.student_id);
        if (!na && !nb) cmp = 0;
        else if (!na) cmp = 1;
        else if (!nb) cmp = -1;
        else cmp = na.date.localeCompare(nb.date) || na.time.localeCompare(nb.time);
      }
      if (cmp !== 0) return sortDir === 'desc' ? -cmp : cmp;
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [students, studentSearch, studentStatusFilter, studentRange, sortField, sortDir, nextLessonMap]);

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'Active').length;
  const tempStopStudents = students.filter((s) => s.status === 'Temporary Stop').length;
  const leftStudents = students.filter((s) => s.status === 'Left').length;
  const lowCreditStudents = students.filter(s => s.status === 'Active' && (s.wallet_balance || 0) <= 2).length;
  const retentionRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const handleStudentStatusChange = async (student: Student, newStatus: 'Active' | 'Temporary Stop' | 'Left') => {
    try {
      await updateStudent.mutateAsync({ studentId: student.student_id, status: newStatus });
      sonnerToast.success(`${student.name} status changed to ${getStatusDisplayLabel(newStatus)}`);
    } catch { sonnerToast.error('Failed to update status'); }
  };

  const getProgramName = (programId: string | null) => {
    if (!programId) return null;
    return programs?.find((p) => p.program_id === programId)?.name || null;
  };

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => {
      const s = new Set(prev);
      if (s.has(studentId)) s.delete(studentId); else s.add(studentId);
      return s;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Temporary Stop': return 'status-grace';
      case 'Left': return 'status-blocked';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Dashboard */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
          <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
          Student Statistics
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <ProgressRing value={retentionRate} size={56} stroke={4} color="hsl(160, 84%, 39%)" />
                  <span className="absolute text-xs font-bold">{retentionRate}%</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-x-6 gap-y-2 flex-1">
                  <div>
                    <p className="text-xl font-bold">{totalStudents}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeStudents}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{tempStopStudents}</p>
                    <p className="text-xs text-muted-foreground">Temp Stop</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-destructive">{leftStudents}</p>
                    <p className="text-xs text-muted-foreground">Left</p>
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${lowCreditStudents > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>{lowCreditStudents}</p>
                    <p className="text-xs text-muted-foreground">Low Credit</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{retentionRate}%</p>
                    <p className="text-xs text-muted-foreground">Retention</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Temporary Stop">Temp Stop</SelectItem>
            <SelectItem value="Left">Left</SelectItem>
          </SelectContent>
        </Select>
        <YearMonthFilter value={studentFilter} onChange={setStudentFilter} />
        <Badge variant="outline" className="text-xs py-1.5 px-3">
          {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
        </Badge>
        <div className="flex border rounded-md">
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
            <TableIcon className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('name')}>
                      Student <ArrowUpDown className={`w-3 h-3 ${sortField === 'name' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    </button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Program</TableHead>
                  <TableHead className="hidden md:table-cell">Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('wallet')}>
                      Wallet <ArrowUpDown className={`w-3 h-3 ${sortField === 'wallet' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    </button>
                  </TableHead>
                  <TableHead className="text-center hidden md:table-cell">Lessons</TableHead>
                  <TableHead className="hidden lg:table-cell">Schedule</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('nextLesson')}>
                      Next Lesson <ArrowUpDown className={`w-3 h-3 ${sortField === 'nextLesson' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No students found</TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const wa = whatsappUrl(student.parent_phone || student.phone);
                    const wallet = student.wallet_balance || 0;
                    const isLowCredit = student.status === 'Active' && wallet <= 2;
                    const next = nextLessonMap.get(student.student_id);
                    const lessonStats = lessonStatsMap.get(student.student_id);

                    return (
                      <TableRow
                        key={student.student_id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${isLowCredit ? 'bg-amber-500/5' : ''}`}
                        onClick={() => toggleStudent(student.student_id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate">{student.name}</span>
                                {isLowCredit && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                              </div>
                              {student.parent_guardian_name && (
                                <p className="text-xs text-muted-foreground truncate">Parent: {student.parent_guardian_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{student.phone}</span>
                            {wa && (
                              <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400" onClick={(e) => e.stopPropagation()}>
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {getProgramName(student.program_id) || '-'}
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
                              <Badge variant="outline" className={`${getStatusBadgeClass(student.status)} border-0`}>
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
                          {student.status === 'Active' ? (
                            <span className={`font-medium ${getWalletColor(wallet)}`}>{wallet}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {lessonStats ? (
                            <div className="flex items-center gap-2 min-w-[90px]">
                              <span className="text-sm font-medium whitespace-nowrap">{lessonStats.used}/{lessonStats.total}</span>
                              <Progress value={lessonStats.total > 0 ? (lessonStats.used / lessonStats.total) * 100 : 0} className="h-1.5 flex-1" />
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {(() => {
                            const sched = scheduleMap?.get(student.student_id);
                            if (!sched || sched.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
                            return (
                              <div className="flex flex-wrap gap-1">
                                {sched.map((s, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                    {DAY_ABBR[s.day]} {formatTime12(s.time)}
                                  </Badge>
                                ))}
                              </div>
                            );
                          })()}
                        <TableCell className="hidden sm:table-cell">
                          {next ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{format(new Date(next.date + 'T00:00:00'), 'MMM d')}</span>
                              <span className="text-muted-foreground">{formatTime12(next.time)}</span>
                            </div>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingStudent(student)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Student</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/students/${student.student_id}`)}>
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

          {/* Expanded student details below table */}
          {filteredStudents.filter(s => expandedStudents.has(s.student_id)).map(student => (
            <div key={student.student_id} className="border rounded-lg bg-muted/10 p-1">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <h3 className="font-semibold">{student.name}</h3>
                <Button variant="ghost" size="sm" onClick={() => toggleStudent(student.student_id)}>
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </Button>
              </div>
              <Tabs defaultValue="lessons" className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-transparent px-4 pt-2">
                  <TabsTrigger value="lessons"><BookOpen className="w-4 h-4 mr-1" /> Lessons</TabsTrigger>
                  <TabsTrigger value="profile"><User className="w-4 h-4 mr-1" /> Profile</TabsTrigger>
                </TabsList>
                <TabsContent value="lessons" className="p-4 mt-0">
                  <StudentLessonsView
                    studentId={student.student_id}
                    studentName={student.name}
                    walletBalance={student.wallet_balance || 0}
                    role="admin"
                  />
                </TabsContent>
                <TabsContent value="profile" className="p-4 mt-0">
                  <StudentInfoView student={student} role="admin" />
                </TabsContent>
              </Tabs>
            </div>
          ))}
        </>
      ) : (
        /* Card View */
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No students found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </CardContent>
            </Card>
          ) : filteredStudents.map((student) => {
            const isExpanded = expandedStudents.has(student.student_id);
            const programName = getProgramName(student.program_id);
            const wallet = student.wallet_balance || 0;
            const isActive = student.status === 'Active';
            const isLowCredit = isActive && wallet <= 2;
            const isInactive = student.status === 'Temporary Stop' || student.status === 'Left';
            const next = nextLessonMap.get(student.student_id);
            const lessonStats = lessonStatsMap.get(student.student_id);
            const lessonProgress = lessonStats && lessonStats.total > 0 ? (lessonStats.used / lessonStats.total) * 100 : 0;

            const borderClass = isInactive
              ? 'border-muted/60 opacity-75'
              : isLowCredit
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-border/50';

            return (
              <Collapsible key={student.student_id} open={isExpanded} onOpenChange={() => toggleStudent(student.student_id)}>
                <div className={`rounded-xl border bg-card/50 overflow-hidden transition-all ${borderClass}`}>
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-base truncate">{student.name}</p>
                              <Badge variant="outline" className={getStatusBadgeClass(student.status)}>
                                {getStatusDisplayLabel(student.status)}
                              </Badge>
                              {isLowCredit && (
                                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Low Credit
                                </Badge>
                              )}
                            </div>
                            {student.parent_guardian_name && (
                              <p className="text-xs text-muted-foreground mt-0.5">Parent: {student.parent_guardian_name}</p>
                            )}
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-3 pl-[52px]">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" /> {student.phone}
                        </div>
                        {programName && (
                          <Badge variant="secondary" className="text-xs font-normal gap-1">
                            <GraduationCap className="w-3 h-3" /> {programName}
                          </Badge>
                        )}
                        {student.student_level && (
                          <Badge variant="secondary" className="text-xs font-normal">Level: {student.student_level}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap pl-[52px]">
                        {isActive && (
                          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${getWalletColor(wallet)}`}>
                            💰 {wallet} lessons
                          </div>
                        )}
                        {lessonStats && lessonStats.total > 0 && (
                          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 min-w-[100px]">
                            <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium">{lessonStats.used}/{lessonStats.total} lessons</p>
                              <Progress value={lessonProgress} className="h-1 mt-0.5" />
                            </div>
                          </div>
                        )}
                        {isActive && next && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{format(new Date(next.date + 'T00:00:00'), 'MMM d')}</span>
                            <span>•</span>
                            <span>{formatTime12(next.time)}</span>
                          </div>
                        )}
                        {isInactive && (
                          <span className="text-xs text-muted-foreground italic">
                            {student.status === 'Temporary Stop' ? 'Currently paused' : 'No longer enrolled'}
                          </span>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border/50 bg-muted/10">
                      <Tabs defaultValue="lessons" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-4 pt-2">
                          <TabsTrigger value="lessons" className="data-[state=active]:bg-muted">
                            <BookOpen className="w-4 h-4 mr-1" /> Lessons
                          </TabsTrigger>
                          <TabsTrigger value="profile" className="data-[state=active]:bg-muted">
                            <User className="w-4 h-4 mr-1" /> Profile
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="lessons" className="p-4 mt-0">
                          <StudentLessonsView
                            studentId={student.student_id}
                            studentName={student.name}
                            walletBalance={student.wallet_balance || 0}
                            role="admin"
                          />
                        </TabsContent>
                        <TabsContent value="profile" className="p-4 mt-0">
                          <StudentInfoView student={student} role="admin" />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      <EditStudentDialog
        student={editingStudent}
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      />
    </div>
  );
}
