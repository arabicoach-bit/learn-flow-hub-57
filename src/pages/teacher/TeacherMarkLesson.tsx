import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, Check, X, RefreshCw, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function TeacherMarkLesson() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
          students(name)
        `)
        .eq('teacher_id', teacherId)
        .in('status', ['completed', 'cancelled', 'rescheduled'])
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });

  const filteredLessons = lessons?.filter((lesson: any) => {
    const studentName = lesson.students?.name || '';
    const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lesson.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Check className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <X className="w-3 h-3 mr-1" />
            Absent
          </Badge>
        );
      case 'rescheduled':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <RefreshCw className="w-3 h-3 mr-1" />
            Rescheduled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const completedCount = lessons?.filter((l: any) => l.status === 'completed').length || 0;
  const absentCount = lessons?.filter((l: any) => l.status === 'cancelled').length || 0;
  const rescheduledCount = lessons?.filter((l: any) => l.status === 'rescheduled').length || 0;

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Lesson History</h1>
          <p className="text-muted-foreground">All lessons you have completed so far</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-red-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{absentCount}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-blue-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{rescheduledCount}</p>
              <p className="text-sm text-muted-foreground">Rescheduled</p>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Absent</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lessons List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              Lessons ({filteredLessons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : filteredLessons.length > 0 ? (
              <div className="space-y-3">
                {filteredLessons.map((lesson: any) => (
                  <div
                    key={lesson.scheduled_lesson_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border/50 bg-card/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{lesson.students?.name || 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(lesson.scheduled_date), 'EEE, MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{formatTime(lesson.scheduled_time)}</span>
                        <span>•</span>
                        <span>{lesson.duration_minutes} min</span>
                      </div>
                    </div>
                    {getStatusBadge(lesson.status)}
                  </div>
                ))}
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
