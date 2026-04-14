import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface StudentAcademicNotesProps {
  studentId: string;
  teacherId?: string;
}

interface LessonNote {
  scheduled_lesson_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string;
  duration_minutes: number;
  teacher_name?: string;
}

export function StudentAcademicNotes({ studentId, teacherId }: StudentAcademicNotesProps) {
  const { data: lessonNotes, isLoading } = useQuery({
    queryKey: ['academic-notes', studentId, teacherId],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id, scheduled_date, scheduled_time, status, notes, duration_minutes, teacher_id')
        .eq('student_id', studentId)
        .not('notes', 'is', null)
        .neq('notes', '')
        .in('status', ['completed', 'absent'])
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch teacher names for the lessons
      const teacherIds = [...new Set((data || []).map(l => l.teacher_id).filter(Boolean))];
      let teacherMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('teacher_id, name')
          .in('teacher_id', teacherIds);
        (teachers || []).forEach(t => teacherMap.set(t.teacher_id, t.name));
      }

      return (data || []).map(l => ({
        ...l,
        teacher_name: l.teacher_id ? teacherMap.get(l.teacher_id) : undefined,
      })) as LessonNote[];
    },
  });

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  if (!lessonNotes || lessonNotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No academic notes yet</p>
        <p className="text-xs mt-1">Notes added when marking lessons will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {lessonNotes.map((note) => (
        <div
          key={note.scheduled_lesson_id}
          className="rounded-lg border border-border/50 bg-card/50 p-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {format(parseISO(note.scheduled_date), 'MMM d, yyyy')}
              </span>
              <span>•</span>
              <span>{formatTime12(note.scheduled_time)}</span>
              {note.teacher_name && (
                <>
                  <span>•</span>
                  <span>{note.teacher_name}</span>
                </>
              )}
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                note.status === 'completed'
                  ? 'text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
                  : 'text-destructive border-destructive/30'
              }`}
            >
              {note.status === 'completed' ? (
                <><CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Done</>
              ) : (
                <><XCircle className="w-2.5 h-2.5 mr-0.5" /> Absent</>
              )}
            </Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
        </div>
      ))}
    </div>
  );
}
