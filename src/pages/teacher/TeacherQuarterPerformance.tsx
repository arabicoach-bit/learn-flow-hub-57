import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherQuarterTab } from '@/components/teachers/TeacherQuarterTab';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TeacherQuarterPerformance() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Quarter Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your yearly performance breakdown by quarter</p>
        </div>

        {teacherId ? (
          <TeacherQuarterTab teacherId={teacherId} />
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No teacher profile linked to your account.
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
