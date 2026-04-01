import { useState, useMemo } from 'react';
import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isToday as isTodayFn } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuarterFilter, getCurrentQuarter, getQuarterDateRange, type QuarterFilterValue } from '@/components/shared/QuarterFilter';
import { TrialLessonCalendarCard, type TrialLessonCalendarData } from '@/components/schedule/TrialLessonCalendarCard';
import { toast } from 'sonner';
import { invalidateAllTrialCaches } from '@/lib/trial-cache-utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users, Clock, Check, X, CalendarDays, Search,
  AlertCircle, Sunrise, Sun, ListFilter, TrendingUp,
  CheckCircle, XCircle, Loader2, ArrowUpDown, MessageSquare,
} from 'lucide-react';

type TrialLesson = TrialLessonCalendarData & { conversion_status?: string; trial_result?: string | null };

function useTeacherTrialData(teacherId: string, startDate: string | null, endDate: string | null) {
  return useQuery({
    queryKey: ['teacher-trial-full', teacherId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('trial_lessons_log')
        .select(`
          trial_lesson_id,
          trial_student_id,
          lesson_date,
          lesson_time,
          duration_minutes,
          status,
          notes,
          teacher_payment_amount,
          trial_students!inner(
            name, phone, age, school, year_group,
            interested_program, student_level, parent_guardian_name,
            conversion_status, trial_result
          )
        `)
        .eq('teacher_id', teacherId)
        .order('lesson_date', { ascending: true });

      if (startDate) query = query.gte('lesson_date', startDate);
      if (endDate) query = query.lte('lesson_date', endDate);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        trial_lesson_id: lesson.trial_lesson_id,
        trial_student_id: lesson.trial_student_id,
        student_name: lesson.trial_students?.name || 'Unknown',
        student_phone: lesson.trial_students?.phone || '',
        lesson_date: lesson.lesson_date,
        lesson_time: lesson.lesson_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        notes: lesson.notes,
        teacher_payment_amount: lesson.teacher_payment_amount,
        age: lesson.trial_students?.age,
        school: lesson.trial_students?.school,
        year_group: lesson.trial_students?.year_group,
        interested_program: lesson.trial_students?.interested_program,
        student_level: lesson.trial_students?.student_level,
        parent_guardian_name: lesson.trial_students?.parent_guardian_name,
        conversion_status: lesson.trial_students?.conversion_status,
        trial_result: lesson.trial_students?.trial_result,
      })) as TrialLesson[];
    },
    enabled: !!teacherId,
    refetchInterval: 60000,
  });
}

function formatTime12(time: string | null) {
  if (!time) return '-';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1"><Check className="w-3 h-3" />Completed</Badge>;
    case 'absent':
      return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 gap-1"><X className="w-3 h-3" />Absent</Badge>;
    default:
      return <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1"><Clock className="w-3 h-3" />Scheduled</Badge>;
  }
}

function getConversionBadge(status?: string) {
  switch (status) {
    case 'Converted':
      return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs">Converted</Badge>;
    case 'Lost':
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">Lost</Badge>;
    default:
      return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">Pending</Badge>;
  }
}

function getResultBadge(result?: string | null) {
  if (!result) return <span className="text-muted-foreground text-xs">-</span>;
  const colors: Record<string, string> = {
    'Very Positive': 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    'Positive': 'bg-sky-500/20 text-sky-600 border-sky-500/30',
    'Neutral': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    'Negative': 'bg-destructive/20 text-destructive border-destructive/30',
  };
  return <Badge className={`${colors[result] || ''} text-xs`}>{result}</Badge>;
}

/* ─── Progress ring SVG ─── */
function ProgressRing({ value, size = 48, stroke = 4, color }: { value: number; size?: number; stroke?: number; color: string }) {
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

type SortField = 'date' | 'name' | 'status';
type SortDir = 'asc' | 'desc';

export default function TeacherTrialLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('today');
  const [filter, setFilter] = useState<QuarterFilterValue>(getCurrentQuarter());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conversionFilter, setConversionFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { startDate, endDate } = getQuarterDateRange(filter);
  const { data: allLessons = [], isLoading, refetch } = useTeacherTrialData(teacherId || '', startDate, endDate);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // ─── Stats ───
  const stats = useMemo(() => {
    const total = allLessons.length;
    const scheduled = allLessons.filter(l => l.status === 'scheduled').length;
    const completed = allLessons.filter(l => l.status === 'completed').length;
    const absent = allLessons.filter(l => l.status === 'absent').length;
    const todayCount = allLessons.filter(l => l.lesson_date === todayStr).length;
    const unmarked = allLessons.filter(l => l.status === 'scheduled' && l.lesson_date < todayStr).length;
    // Deduplicate conversion stats by trial_student_id to match admin trial page
    const uniqueStudents = new Map<string, string>();
    allLessons.forEach(l => {
      if (!uniqueStudents.has(l.trial_student_id)) {
        uniqueStudents.set(l.trial_student_id, l.conversion_status || 'Pending');
      }
    });
    const pending = Array.from(uniqueStudents.values()).filter(s => s === 'Pending').length;
    const converted = Array.from(uniqueStudents.values()).filter(s => s === 'Converted').length;
    const lost = Array.from(uniqueStudents.values()).filter(s => s === 'Lost').length;
    const completedStudents = new Set(allLessons.filter(l => l.status === 'completed').map(l => l.trial_student_id)).size;
    const conversionRate = completedStudents > 0 ? Math.round((converted / completedStudents) * 100) : 0;
    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const absenceRate = total > 0 ? Math.round((absent / total) * 100) : 0;
    return { total, scheduled, completed, absent, todayCount, unmarked, pending, converted, lost, conversionRate, attendanceRate, absenceRate };
  }, [allLessons, todayStr]);

  // ─── Today/Tomorrow/Unmarked ───
  const todayLessons = useMemo(() =>
    allLessons.filter(l => l.lesson_date === todayStr).sort((a, b) => (a.lesson_time || '').localeCompare(b.lesson_time || '')),
    [allLessons, todayStr]);

  const tomorrowLessons = useMemo(() =>
    allLessons.filter(l => l.lesson_date === tomorrowStr).sort((a, b) => (a.lesson_time || '').localeCompare(b.lesson_time || '')),
    [allLessons, tomorrowStr]);

  const unmarkedLessons = useMemo(() =>
    allLessons.filter(l => l.status === 'scheduled' && l.lesson_date < todayStr).sort((a, b) => b.lesson_date.localeCompare(a.lesson_date)),
    [allLessons, todayStr]);

  // ─── Filtered + Sorted for table ───
  const filteredLessons = useMemo(() => {
    let results = [...allLessons];
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(l => l.student_name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') results = results.filter(l => l.status === statusFilter);
    if (conversionFilter !== 'all') results = results.filter(l => (l.conversion_status || 'Pending') === conversionFilter);

    results.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.lesson_date.localeCompare(b.lesson_date) || (a.lesson_time || '').localeCompare(b.lesson_time || '');
      else if (sortField === 'name') cmp = a.student_name.localeCompare(b.student_name);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return results;
  }, [allLessons, search, statusFilter, conversionFilter, sortField, sortDir]);

  // ─── Calendar helpers ───
  const lessonsByDate = useMemo(() => {
    const grouped = new Map<string, TrialLesson[]>();
    allLessons.forEach(l => {
      if (!grouped.has(l.lesson_date)) grouped.set(l.lesson_date, []);
      grouped.get(l.lesson_date)!.push(l);
    });
    return grouped;
  }, [allLessons]);

  const selectedDateLessons = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return (lessonsByDate.get(key) || []).sort((a, b) => (a.lesson_time || '').localeCompare(b.lesson_time || ''));
  }, [selectedDate, lessonsByDate]);

  const getDayContent = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const lessons = lessonsByDate.get(key);
    if (!lessons?.length) return null;
    return (
      <div className="flex gap-0.5 mt-0.5">
        {lessons.some(l => l.status === 'scheduled') && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
        {lessons.some(l => l.status === 'completed') && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {lessons.some(l => l.status === 'absent') && <div className="w-1.5 h-1.5 rounded-full bg-destructive" />}
      </div>
    );
  };

  // ─── Inline status update ───
  const handleInlineStatus = async (lessonId: string, newStatus: string) => {
    setUpdatingId(lessonId);
    try {
      const { error } = await supabase
        .from('trial_lessons_log')
        .update({ status: newStatus })
        .eq('trial_lesson_id', lessonId);
      if (error) throw error;
      toast.success(`Marked as ${newStatus}`);
      invalidateAllTrialCaches(queryClient);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  if (!teacherId) {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unable to load trial lessons. Please try again.</p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Trial Lessons</h1>
            <p className="text-muted-foreground">Manage and track your trial students</p>
          </div>
          <YearMonthFilter value={filter} onChange={setFilter} />
        </div>

        {/* ═══════ STATS DASHBOARD ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attendance Stats */}
          <Card className="border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <ProgressRing value={stats.attendanceRate} size={64} stroke={5} color="hsl(160, 84%, 39%)" />
                  <span className="absolute text-sm font-bold">{isLoading ? '-' : `${stats.attendanceRate}%`}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-2 flex-1">
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? '-' : stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">{isLoading ? '-' : stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{isLoading ? '-' : stats.absent}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-500">{isLoading ? '-' : stats.scheduled}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{isLoading ? '-' : stats.todayCount}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${stats.unmarked > 0 ? 'text-destructive' : ''}`}>{isLoading ? '-' : stats.unmarked}</p>
                    <p className="text-xs text-muted-foreground">Unmarked</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Stats */}
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conversion Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <ProgressRing value={stats.conversionRate} size={64} stroke={5} color="hsl(271, 91%, 65%)" />
                  <span className="absolute text-sm font-bold">{isLoading ? '-' : `${stats.conversionRate}%`}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-2 flex-1">
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{isLoading ? '-' : stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">{isLoading ? '-' : stats.converted}</p>
                    <p className="text-xs text-muted-foreground">Converted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{isLoading ? '-' : stats.lost}</p>
                    <p className="text-xs text-muted-foreground">Lost</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════ TABS ═══════ */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="today" className="gap-1.5">
              <Sunrise className="w-4 h-4" /> Today
              {stats.todayCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{stats.todayCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <ListFilter className="w-4 h-4" /> All Trials
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="w-4 h-4" /> Calendar
            </TabsTrigger>
          </TabsList>

          {/* ══ TODAY TAB ══ */}
          <TabsContent value="today" className="space-y-6 mt-4">
            {unmarkedLessons.length > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {unmarkedLessons.length} Unmarked Trial Lesson{unmarkedLessons.length !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                  {unmarkedLessons.map(lesson => (
                    <TrialLessonCalendarCard key={lesson.trial_lesson_id} lesson={lesson} onUpdated={() => refetch()} />
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sun className="w-5 h-5 text-purple-500" />
                  Today — {format(new Date(), 'EEEE, MMMM d')}
                  {todayLessons.length > 0 && (
                    <Badge variant="outline" className="ml-2">{todayLessons.length} trial{todayLessons.length !== 1 ? 's' : ''}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32" />)}</div>
                ) : todayLessons.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No trial lessons today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayLessons.map(lesson => (
                      <TrialLessonCalendarCard key={lesson.trial_lesson_id} lesson={lesson} onUpdated={() => refetch()} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {tomorrowLessons.length > 0 && (
              <Card className="glass-card opacity-80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                    <Sunrise className="w-4 h-4" />
                    Tomorrow — {format(addDays(new Date(), 1), 'EEEE, MMMM d')}
                    <Badge variant="outline" className="ml-1">{tomorrowLessons.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tomorrowLessons.map(lesson => (
                      <TrialLessonCalendarCard key={lesson.trial_lesson_id} lesson={lesson} onUpdated={() => refetch()} readOnly />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══ ALL TRIALS TAB ══ */}
          <TabsContent value="list" className="space-y-4 mt-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Attendance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Attendance</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={conversionFilter} onValueChange={setConversionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Conversion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conversion</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Converted">Converted</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="self-center text-xs py-1.5 px-3">
                {filteredLessons.length} result{filteredLessons.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Table */}
            <Card className="glass-card">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                ) : filteredLessons.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No trial lessons found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => toggleSort('date')}>
                              Date <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => toggleSort('name')}>
                              Student <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Program</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => toggleSort('status')}>
                              Status <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Conversion</TableHead>
                          <TableHead>Teacher Notes</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLessons.map(lesson => {
                          const lessonDate = new Date(lesson.lesson_date + 'T00:00:00');
                          const isToday = lesson.lesson_date === todayStr;
                          const isPast = lesson.lesson_date < todayStr;
                          const isUnmarked = lesson.status === 'scheduled' && isPast;
                          const isThisUpdating = updatingId === lesson.trial_lesson_id;
                          return (
                            <TableRow
                              key={lesson.trial_lesson_id}
                              className={`${isToday ? 'bg-purple-500/5' : ''} ${isUnmarked ? 'bg-amber-500/5' : ''}`}
                            >
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {format(lessonDate, 'MMM d')}
                                  {isToday && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1">Today</Badge>}
                                  {isUnmarked && <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] px-1">!</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{formatTime12(lesson.lesson_time)}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{lesson.student_name}</span>
                                  {lesson.age != null && <span className="text-xs text-muted-foreground ml-1">({lesson.age}y)</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{lesson.interested_program || '-'}</TableCell>
                              <TableCell className="text-sm">{lesson.student_level || '-'}</TableCell>
                              <TableCell>{getStatusBadge(lesson.status)}</TableCell>
                              <TableCell>{getResultBadge(lesson.trial_result)}</TableCell>
                              <TableCell>{getConversionBadge(lesson.conversion_status)}</TableCell>
                              <TableCell className="max-w-[200px]">
                                {lesson.notes ? (
                                  <p className="text-sm text-muted-foreground truncate" title={lesson.notes}>{lesson.notes}</p>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {lesson.status === 'scheduled' ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/20"
                                      onClick={() => handleInlineStatus(lesson.trial_lesson_id, 'completed')}
                                      disabled={isThisUpdating}
                                      title="Mark Completed"
                                    >
                                      {isThisUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive hover:bg-destructive/20"
                                      onClick={() => handleInlineStatus(lesson.trial_lesson_id, 'absent')}
                                      disabled={isThisUpdating}
                                      title="Mark Absent"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ CALENDAR TAB ══ */}
          <TabsContent value="calendar" className="space-y-6 mt-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-purple-500" />
                  Trial Lessons Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={viewMonth}
                    onMonthChange={setViewMonth}
                    className="rounded-md border w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                      month: "space-y-4 w-full",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-12 w-full text-center text-sm p-0 relative",
                      day: "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md flex flex-col items-center justify-center",
                    }}
                    components={{
                      DayContent: ({ date }) => (
                        <div className="flex flex-col items-center">
                          <span>{date.getDate()}</span>
                          {getDayContent(date)}
                        </div>
                      ),
                    }}
                  />
                )}
                <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span>Scheduled</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Completed</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive" /><span>Absent</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedDate && isTodayFn(selectedDate) && (
                      <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Today</Badge>
                    )}
                    {selectedDateLessons.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" /> {selectedDateLessons.length} trial{selectedDateLessons.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDateLessons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No trial lessons on this date</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {selectedDateLessons.map(lesson => (
                      <TrialLessonCalendarCard key={lesson.trial_lesson_id} lesson={lesson} onUpdated={() => refetch()} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeacherLayout>
  );
}
