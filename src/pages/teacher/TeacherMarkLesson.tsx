import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, Search, Check, X, Calendar, ChevronDown, Clock, User, MessageSquare } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function TeacherMarkLesson() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['teacher-lesson-history', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select(`
          scheduled_lesson_id,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          status,
          student_id,
          students(name, wallet_balance)
        `)
        .eq('teacher_id', teacherId)
        .in('status', ['completed', 'absent'])
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });

  // Also fetch notes from lessons_log
  const { data: lessonNotes } = useQuery({
    queryKey: ['teacher-lesson-notes', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('lessons_log')
        .select('lesson_id, student_id, lesson_date, status, notes')
        .eq('teacher_id', teacherId)
        .order('lesson_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });

  // Filter by month
  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const filteredLessons = useMemo(() => {
    return lessons?.filter((lesson: any) => {
      const studentName = lesson.students?.name || '';
      const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lesson.status === statusFilter;
      const matchesMonth = lesson.scheduled_date >= monthStartStr && lesson.scheduled_date <= monthEndStr;
      return matchesSearch && matchesStatus && matchesMonth;
    }) || [];
  }, [lessons, searchQuery, statusFilter, monthStartStr, monthEndStr]);

  // Group lessons by student
  const studentGroups = useMemo(() => {
    const groups: Record<string, {
      studentId: string;
      studentName: string;
      walletBalance: number;
      lessons: typeof filteredLessons;
      completedCount: number;
      absentCount: number;
      totalHours: number;
    }> = {};

    filteredLessons.forEach((lesson: any) => {
      const studentId = lesson.student_id || 'unknown';
      const studentName = lesson.students?.name || 'Unknown';
      if (!groups[studentId]) {
        groups[studentId] = {
          studentId,
          studentName,
          walletBalance: lesson.students?.wallet_balance || 0,
          lessons: [],
          completedCount: 0,
          absentCount: 0,
          totalHours: 0,
        };
      }
      groups[studentId].lessons.push(lesson);
      if (lesson.status === 'completed') {
        groups[studentId].completedCount++;
        groups[studentId].totalHours += (lesson.duration_minutes || 45) / 60;
      } else if (lesson.status === 'absent') {
        groups[studentId].absentCount++;
      }
    });

    return Object.values(groups).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredLessons]);

  // Get notes for a specific student and date
  const getNotesForLesson = (studentId: string, date: string) => {
    return lessonNotes?.find(n => n.student_id === studentId && n.lesson_date === date)?.notes || null;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) newSet.delete(studentId);
      else newSet.add(studentId);
      return newSet;
    });
  };

  // Overall monthly stats
  const totalCompleted = studentGroups.reduce((sum, g) => sum + g.completedCount, 0);
  const totalAbsent = studentGroups.reduce((sum, g) => sum + g.absentCount, 0);
  const totalHours = studentGroups.reduce((sum, g) => sum + g.totalHours, 0);

  // Generate month options
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy'),
      });
    }
    return months;
  }, []);

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Lesson History</h1>
          <p className="text-muted-foreground">Lessons organized by student with notes and monthly analysis</p>
        </div>

        {/* Monthly Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{totalCompleted}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-red-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{totalAbsent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-blue-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{totalHours.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students with Lessons */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              Students ({studentGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : studentGroups.length > 0 ? (
              <div className="space-y-3">
                {studentGroups.map((group) => {
                  const isExpanded = expandedStudents.has(group.studentId);
                  return (
                    <Collapsible
                      key={group.studentId}
                      open={isExpanded}
                      onOpenChange={() => toggleStudent(group.studentId)}
                    >
                      <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-muted/30 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3 text-left">
                              <User className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{group.studentName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Balance: {group.walletBalance} lessons
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-2 text-xs">
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  {group.completedCount} completed
                                </Badge>
                                {group.absentCount > 0 && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                    {group.absentCount} absent
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {group.totalHours.toFixed(1)}h
                                </Badge>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-border/50 bg-muted/10">
                            {group.lessons.map((lesson: any) => {
                              const noteText = getNotesForLesson(lesson.student_id, lesson.scheduled_date);
                              return (
                                <div
                                  key={lesson.scheduled_lesson_id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-border/30 last:border-b-0"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span>{format(new Date(lesson.scheduled_date), 'EEE, MMM d')}</span>
                                      <span className="text-muted-foreground">•</span>
                                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span>{formatTime(lesson.scheduled_time)}</span>
                                      <span className="text-muted-foreground">•</span>
                                      <span className="text-muted-foreground">{lesson.duration_minutes} min</span>
                                    </div>
                                    {noteText && (
                                      <div className="flex items-start gap-1.5 mt-1 text-xs text-muted-foreground">
                                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span>{noteText}</span>
                                      </div>
                                    )}
                                  </div>
                                  {lesson.status === 'completed' ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                      <Check className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                      <X className="w-3 h-3 mr-1" />
                                      Absent
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {searchQuery || statusFilter !== 'all' ? 'No lessons match your filters' : 'No lesson history yet'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
