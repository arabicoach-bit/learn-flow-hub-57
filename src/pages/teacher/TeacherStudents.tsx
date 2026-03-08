import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStudents } from '@/hooks/use-students';
import { usePrograms } from '@/hooks/use-programs';
import { useScheduledLessons } from '@/hooks/use-scheduled-lessons';
import { getWalletColor, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { StudentLessonsView } from '@/components/student/StudentLessonsView';
import { StudentInfoView } from '@/components/student/StudentInfoView';
import {
  GraduationCap, Search, Phone, ChevronDown, User, BookOpen,
  AlertTriangle, Users, UserCheck, PauseCircle, UserX, TrendingUp,
  LayoutGrid, TableIcon, Calendar, Clock, RefreshCw,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { YearMonthFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

export default function TeacherStudents() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [studentFilter, setStudentFilter] = useState<YearMonthFilterValue>({ year: null, month: null });

  const { data: students, isLoading: studentsLoading, refetch } = useStudents();
  const { data: programs } = usePrograms();
  const { data: allLessons } = useScheduledLessons({ teacher_id: teacherId });

  const myStudents = students?.filter(s => s.teacher_id === teacherId) || [];
  const studentRange = getFilterDateRange(studentFilter);

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
    return myStudents.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.phone.includes(search);
      const matchesStatus = !statusFilter || student.status === statusFilter;
      const matchesProgram = !programFilter || student.program_id === programFilter;
      const createdAt = student.created_at ? new Date(student.created_at) : null;
      const matchesDate = !createdAt || (
        (!studentRange.startDate || createdAt >= new Date(studentRange.startDate)) &&
        (!studentRange.endDate || createdAt <= new Date(studentRange.endDate + 'T23:59:59'))
      );
      return matchesSearch && matchesStatus && matchesProgram && matchesDate;
    });
  }, [myStudents, search, statusFilter, programFilter, studentRange]);

  // Stats
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(s => s.status === 'Active').length;
  const tempStopStudents = filteredStudents.filter(s => s.status === 'Temporary Stop').length;
  const leftStudents = filteredStudents.filter(s => s.status === 'Left').length;
  const overdueStudents = filteredStudents.filter(s => s.status === 'Active' && (s.wallet_balance || 0) <= 0).length;
  const retentionRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  // Unique programs for filter
  const usedPrograms = useMemo(() => {
    const ids = new Set(myStudents.map(s => s.program_id).filter(Boolean));
    return programs?.filter(p => ids.has(p.program_id)) || [];
  }, [myStudents, programs]);

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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="w-4 h-4 text-primary" /></div>
              <div><p className="text-xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">Total</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><UserCheck className="w-4 h-4 text-emerald-500" /></div>
              <div><p className="text-xl font-bold">{activeStudents}</p><p className="text-xs text-muted-foreground">Active</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
              <div><p className="text-xl font-bold">{overdueStudents}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><PauseCircle className="w-4 h-4 text-amber-500" /></div>
              <div><p className="text-xl font-bold">{tempStopStudents}</p><p className="text-xs text-muted-foreground">Temp Stop</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><UserX className="w-4 h-4 text-destructive" /></div>
              <div><p className="text-xl font-bold">{leftStudents}</p><p className="text-xs text-muted-foreground">Left</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp className="w-4 h-4 text-blue-500" /></div>
              <div><p className="text-xl font-bold">{retentionRate}%</p><p className="text-xs text-muted-foreground">Retention</p></div>
            </CardContent>
          </Card>
        </div>

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
              {usedPrograms.length > 0 && (
                <Select value={programFilter || 'all'} onValueChange={(v) => setProgramFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {usedPrograms.map(p => (
                      <SelectItem key={p.program_id} value={p.program_id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <YearMonthFilter value={studentFilter} onChange={setStudentFilter} />
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5 text-emerald-500" />
                Students ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Next Lesson</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(student => {
                      const programName = getProgramName(student.program_id);
                      const wallet = student.wallet_balance || 0;
                      const isOverdue = student.status === 'Active' && wallet <= 0;
                      const next = nextLessonMap.get(student.student_id);

                      return (
                        <TableRow
                          key={student.student_id}
                          className={`cursor-pointer hover:bg-muted/30 ${isOverdue ? 'bg-destructive/5' : ''}`}
                          onClick={() => toggleStudent(student.student_id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{student.name}</span>
                              {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                            </div>
                            {student.parent_guardian_name && (
                              <p className="text-xs text-muted-foreground">{student.parent_guardian_name}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{student.phone}</TableCell>
                          <TableCell>
                            {programName ? (
                              <Badge variant="secondary" className="text-xs">{programName}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{student.student_level || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusBadgeClass(student.status)}>
                              {getStatusDisplayLabel(student.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getWalletColor(wallet)} text-xs`}>
                              💰 {wallet}
                            </Badge>
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
                <div key={student.student_id} className="mt-4 border rounded-lg bg-muted/10 p-1">
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
              const isOverdue = student.status === 'Active' && wallet <= 0;
              const lowCredit = wallet > 0 && wallet <= 2;
              const next = nextLessonMap.get(student.student_id);

              return (
                <Collapsible
                  key={student.student_id}
                  open={isExpanded}
                  onOpenChange={() => toggleStudent(student.student_id)}
                >
                  <div className={`rounded-lg border bg-card/50 overflow-hidden ${isOverdue ? 'border-destructive/40 bg-destructive/5' : 'border-border/50'}`}>
                    <CollapsibleTrigger className="w-full">
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-base">{student.name}</p>
                            <Badge variant="outline" className={getStatusBadgeClass(student.status)}>
                              {getStatusDisplayLabel(student.status)}
                            </Badge>
                            {isOverdue && (
                              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs gap-1">
                                <AlertTriangle className="w-3 h-3" /> Overdue
                              </Badge>
                            )}
                            {lowCredit && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1">
                                <AlertTriangle className="w-3 h-3" /> Low Credit
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {student.phone}</span>
                            {programName && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {programName}</span>}
                            {student.student_level && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {student.student_level}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Next lesson preview */}
                          {next && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{format(new Date(next.date + 'T00:00:00'), 'MMM d')}</span>
                              <span className="text-xs">•</span>
                              <span>{formatTime12(next.time)}</span>
                            </div>
                          )}
                          <Badge className={`${getWalletColor(wallet)} text-xs gap-1`}>
                            💰 {wallet} lessons
                          </Badge>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
