import { AdminLayout } from '@/components/layout/AdminLayout';
import { LessonsCalendar } from '@/components/calendar/LessonsCalendar';

export default function LessonsCalendarPage() {
  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Lessons Calendar</h1>
          <p className="text-muted-foreground">View scheduled lessons across all students and teachers</p>
        </div>

        <LessonsCalendar showFilters={true} />
      </div>
    </AdminLayout>
  );
}
