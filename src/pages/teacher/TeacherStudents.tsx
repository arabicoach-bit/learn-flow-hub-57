import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStudents } from '@/hooks/use-students';
import { usePrograms } from '@/hooks/use-programs';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWalletColor, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { StudentLessonsView } from '@/components/student/StudentLessonsView';
import { StudentInfoView } from '@/components/student/StudentInfoView';
import {
  GraduationCap, Search, Phone, ChevronDown, User, BookOpen,
  AlertTriangle, Users, UserCheck, PauseCircle, UserX, TrendingUp,
  LayoutGrid, TableIcon, Calendar, CalendarDays, Clock, RefreshCw, ArrowUpDown,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { YearMonthFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

/* ─── Progress Ring ─── */
function ProgressRing({ value, size = 64, stroke = 5, color }: { value: number; size?: number; stroke?: number; color: string }) {
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

export default function TeacherStudents() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [studentFilter, setStudentFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: students, isLoading: studentsLoading, refetch } = useStudents();
  const { data: programs } = usePrograms();
  const { data: allLessons } = useScheduledLessons({ teacher_id: teacherId });

  const myStudents = students?.filter(s => s.teacher_id === teacherId) || [];
  const studentRange = getFilterDateRange(studentFilter);

  const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch active packages for these students (not relying on stale current_package_id)
  const myStudentIds = useMemo(() => myStudents.map(s => s.student_id), [myStudents]);
  const { data: activePackagesData } = useQuery({
    queryKey: ['teacher-active-packages', teacherId, myStudentIds.sort().join(',')],
    queryFn: async () => {
      if (myStudentIds.length === 0) return [];
      const { data } = await supabase
        .from('packages')
        .select('package_id, student_id, lessons_purchased')
        .in('student_id', myStudentIds)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: myStudentIds.length > 0,
    staleTime: 60_000,
  });

  const studentActivePackageMap = useMemo(() => {
    const map = new Map<string, { packageId: string; lessonsPurchased: number }>();
    (activePackagesData || []).forEach(p => {
      if (!map.has(p.student_id)) map.set(p.student_id, { packageId: p.package_id, lessonsPurchased: p.lessons_purchased });
    });
    return map;
  }, [activePackagesData]);

  const activePackageIds = useMemo(() => {
    return Array.from(studentActivePackageMap.values()).map(v => v.packageId);
  }, [studentActivePackageMap]);

  const { data: scheduleMap } = useQuery({
    queryKey: ['teacher-student-schedules', activePackageIds.sort().join(',')],
    queryFn: async () => {
      if (activePackageIds.length === 0) return new Map<string, { day: number; time: string }[]>();
      const { data } = await supabase
        .from('lesson_schedules')
        .select('package_id, day_of_week, time_slot')
        .in('package_id', activePackageIds)
        .order('day_of_week');
      
      // Build reverse map using active packages
      const pkgToStudent = new Map<string, string>();
      studentActivePackageMap.forEach((val, studentId) => {
        pkgToStudent.set(val.packageId, studentId);
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

  // Lesson stats per student — uses lessons_purchased for total (accurate), counts used from lesson rows
  const lessonStatsMap = useMemo(() => {
    const map = new Map<string, { used: number; total: number }>();
    // Initialize with lessons_purchased from packages
    studentActivePackageMap.forEach((val, studentId) => {
      map.set(studentId, { used: 0, total: val.lessonsPurchased });
    });
    if (!allLessons) return map;
    const activePkgIds = new Set(activePackageIds);
    allLessons.forEach(l => {
      if (!l.student_id || !l.package_id || !activePkgIds.has(l.package_id)) return;
      if (!map.has(l.student_id)) map.set(l.student_id, { used: 0, total: 0 });
      const entry = map.get(l.student_id)!;
      if (l.status === 'completed' || l.status === 'absent') entry.used++;
    });
    return map;
  }, [allLessons, activePackageIds, studentActivePackageMap]);

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
    let results = myStudents.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.phone.includes(search);
      const matchesStatus = !statusFilter || student.status === statusFilter;
      const createdAt = student.created_at ? new Date(student.created_at) : null;
      const matchesDate = !createdAt || (
        (!studentRange.startDate || createdAt >= new Date(studentRange.startDate)) &&
        (!studentRange.endDate || createdAt <= new Date(studentRange.endDate + 'T23:59:59'))
      );
      return matchesSearch && matchesStatus && matchesDate;
    });

    // Default sort: Active (low credit first) → Stop → Left, then by name
    const statusOrder = (s: string | null) => {
      if (s === 'Active') return 0;
      if (s === 'Temporary Stop') return 1;
      if (s === 'Left') return 2;
      return 3;
    };

    results.sort((a, b) => {
      // Primary: status group
      const statusCmp = statusOrder(a.status) - statusOrder(b.status);
      if (statusCmp !== 0) return statusCmp;

      // Within Active: low credit (wallet ≤ 2) first
      if (a.status === 'Active') {
        const aLow = (a.wallet_balance || 0) <= 2 ? 0 : 1;
        const bLow = (b.wallet_balance || 0) <= 2 ? 0 : 1;
        if (aLow !== bLow) return aLow - bLow;
      }

      // Secondary: user-chosen sort
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'status') cmp = 0; // already sorted by status
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

      // Fallback: alphabetical
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [myStudents, search, statusFilter, studentRange, sortField, sortDir, nextLessonMap]);

  // Stats
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(s => s.status === 'Active').length;
  const tempStopStudents = filteredStudents.filter(s => s.status === 'Temporary Stop').length;
  const leftStudents = filteredStudents.filter(s => s.status === 'Left').length;
  const lowCreditStudents = filteredStudents.filter(s => s.status === 'Active' && (s.wallet_balance || 0) <= 2).length;
  const retentionRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) newSet.delete(studentId);
      else newSet.add(studentId);
      return newSet;
    });
  };

  const getProgramName = (programId: string | null) => {
    if (!programId) return null;
    return programs?.find(p => p.program_id === programId)?.name;
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Temporary Stop': return 'status-grace';
      case 'Left': return 'status-blocked';
      default: return '';
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">My Students</h1>
            <p className="text-muted-foreground">Manage your students, lessons, and profiles</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* ═══════ STATS DASHBOARD ═══════ */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Student Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center">
                <ProgressRing value={retentionRate} size={64} stroke={5} color="hsl(160, 84%, 39%)" />
                <span className="absolute text-sm font-bold">{studentsLoading ? '-' : `${retentionRate}%`}</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-x-6 gap-y-2 flex-1">
                <div>
                  <p className="text-2xl font-bold">{studentsLoading ? '-' : totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-500">{studentsLoading ? '-' : activeStudents}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{studentsLoading ? '-' : tempStopStudents}</p>
                  <p className="text-xs text-muted-foreground">Temp Stop</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{studentsLoading ? '-' : leftStudents}</p>
                  <p className="text-xs text-muted-foreground">Left</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${lowCreditStudents > 0 ? 'text-amber-500' : ''}`}>{studentsLoading ? '-' : lowCreditStudents}</p>
                  <p className="text-xs text-muted-foreground">Low Credit</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{studentsLoading ? '-' : `${retentionRate}%`}</p>
                  <p className="text-xs text-muted-foreground">Retention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
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
                <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}>
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
                  <TableIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {studentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* ===== TABLE VIEW ===== */
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => toggleSort('name')}>
                          Student <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => toggleSort('status')}>
                          Status <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => toggleSort('wallet')}>
                          Wallet <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Lessons</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => toggleSort('nextLesson')}>
                          Next Lesson <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(student => {
                      const programName = getProgramName(student.program_id);
                      const wallet = student.wallet_balance || 0;
                      const isLowCredit = student.status === 'Active' && wallet <= 2;
                      const next = nextLessonMap.get(student.student_id);
                      const lessonStats = lessonStatsMap.get(student.student_id);

                      return (
                        <TableRow
                          key={student.student_id}
                          className={`cursor-pointer hover:bg-muted/30 ${isLowCredit ? 'bg-amber-500/5' : ''}`}
                          onClick={() => toggleStudent(student.student_id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium">{student.name}</span>
                                  {isLowCredit && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                </div>
                                {student.parent_guardian_name && (
                                  <p className="text-xs text-muted-foreground">{student.parent_guardian_name}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{student.phone}</TableCell>
                          <TableCell>
                            {programName ? (
                              <Badge variant="secondary" className="text-xs">{programName}</Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{student.student_level || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusBadgeClass(student.status)}>
                              {getStatusDisplayLabel(student.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {student.status === 'Active' ? (
                              <Badge className={`${getWalletColor(wallet)} text-xs`}>
                                💰 {wallet}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lessonStats ? (
                              <div className="flex items-center gap-2 min-w-[100px]">
                                <span className="text-sm font-medium whitespace-nowrap">{lessonStats.used}/{lessonStats.total}</span>
                                <Progress
                                  value={lessonStats.total > 0 ? (lessonStats.used / lessonStats.total) * 100 : 0}
                                  className="h-1.5 flex-1"
                                />
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            {next ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{format(new Date(next.date + 'T00:00:00'), 'MMM d')}</span>
                                <Clock className="w-3 h-3 text-muted-foreground ml-1" />
                                <span className="text-muted-foreground">{formatTime12(next.time)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Expanded student detail (shown below table) */}
              {filteredStudents.filter(s => expandedStudents.has(s.student_id)).map(student => (
                <div key={student.student_id} className="mt-4 border rounded-lg bg-muted/10 p-1 mx-4 mb-4">
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
                        role="teacher"
                        teacherId={teacherId}
                      />
                    </TabsContent>
                    <TabsContent value="profile" className="p-4 mt-0">
                      <StudentInfoView student={student} role="teacher" />
                    </TabsContent>
                  </Tabs>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          /* ===== CARD VIEW ===== */
          <div className="space-y-3">
            {filteredStudents.map((student) => {
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
                <Collapsible
                  key={student.student_id}
                  open={isExpanded}
                  onOpenChange={() => toggleStudent(student.student_id)}
                >
                  <div className={`rounded-xl border bg-card/50 overflow-hidden transition-all ${borderClass}`}>
                    <CollapsibleTrigger className="w-full">
                      <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                        {/* Top Row: Avatar + Name + Badges */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                              isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
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

                        {/* Info Chips Row */}
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

                        {/* Weekly Schedule Row */}
                        {(() => {
                          const sched = scheduleMap?.get(student.student_id);
                          if (!sched || sched.length === 0) return null;
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap mb-3 pl-[52px]">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {sched.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal gap-0.5">
                                  <span className="font-medium">{DAY_ABBR[s.day]}</span>
                                  <span className="text-muted-foreground">{formatTime12(s.time)}</span>
                                </Badge>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Metrics Row */}
                        <div className="flex items-center gap-2.5 flex-wrap pl-[52px]">
                          {/* Wallet - only for Active */}
                          {isActive && (
                            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${getWalletColor(wallet)}`}>
                              💰 {wallet} lessons
                            </div>
                          )}

                          {/* Lessons Progress */}
                          {lessonStats && lessonStats.total > 0 && (
                            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 min-w-[100px]">
                              <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium">{lessonStats.used}/{lessonStats.total} lessons</p>
                                <Progress value={lessonProgress} className="h-1 mt-0.5" />
                              </div>
                            </div>
                          )}

                          {/* Next Lesson - only for Active */}
                          {isActive && next && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>{format(new Date(next.date + 'T00:00:00'), 'MMM d')}</span>
                              <span>•</span>
                              <span>{formatTime12(next.time)}</span>
                            </div>
                          )}

                          {/* Inactive label */}
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
                              role="teacher"
                              teacherId={teacherId}
                            />
                          </TabsContent>
                          <TabsContent value="profile" className="p-4 mt-0">
                            <StudentInfoView student={student} role="teacher" />
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
      </div>
    </TeacherLayout>
  );
}
