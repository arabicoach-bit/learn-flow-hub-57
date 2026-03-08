import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { TrialLessonCalendar } from '@/components/calendar/TrialLessonCalendar';

export default function TeacherTrialLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

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
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Trial Lessons</h1>
          <p className="text-muted-foreground">View and manage trial lessons assigned to you</p>
        </div>

        <TrialLessonCalendar teacherId={teacherId} />
      </div>
    </TeacherLayout>
  );
}
