import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherCalendar } from '@/components/calendar/TeacherCalendar';

export default function TeacherSchedule() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  if (!teacherId) {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unable to load schedule. Please try again.</p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Schedule</h1>
          <p className="text-muted-foreground">View your lessons calendar</p>
        </div>

        <TeacherCalendar teacherId={teacherId} />
      </div>
    </TeacherLayout>
  );
}
