import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useClasses } from '@/hooks/use-classes';
import { useStudents } from '@/hooks/use-students';
import { useMarkLesson } from '@/hooks/use-lessons';
import { getWalletColor } from '@/lib/wallet-utils';
import { CheckSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

type LessonStatus = 'Taken' | 'Absent' | 'Cancelled';

interface StudentLessonState {
  [studentId: string]: LessonStatus | null;
}

export default function TeacherMarkLesson() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const teacherId = profile?.teacher_id;

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [studentStatuses, setStudentStatuses] = useState<StudentLessonState>({});
  const [notes, setNotes] = useState<{ [studentId: string]: string }>({});

  const { data: classes, isLoading: classesLoading } = useClasses();
  const myClasses = classes?.filter(c => c.teacher_id === teacherId) || [];

  const { data: students, isLoading: studentsLoading } = useStudents();
  const classStudents = students?.filter(s => s.class_id === selectedClassId) || [];

  const markLesson = useMarkLesson();

  const handleStatusChange = (studentId: string, status: LessonStatus) => {
    setStudentStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!selectedClassId || !teacherId) {
      toast({
        title: 'Error',
        description: 'Please select a class first',
        variant: 'destructive',
      });
      return;
    }

    const studentsToMark = Object.entries(studentStatuses).filter(([_, status]) => status !== null);
    
    if (studentsToMark.length === 0) {
      toast({
        title: 'No Students Selected',
        description: 'Please mark at least one student',
        variant: 'destructive',
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [studentId, status] of studentsToMark) {
      const student = classStudents.find(s => s.student_id === studentId);
      
      // Check if trying to mark "Taken" for blocked student
      if (status === 'Taken' && student?.status === 'Blocked') {
        toast({
          title: 'Cannot Mark Lesson',
          description: `${student.name} is blocked. Contact admin.`,
          variant: 'destructive',
        });
        errorCount++;
        continue;
      }

      try {
        await markLesson.mutateAsync({
          student_id: studentId,
          class_id: selectedClassId,
          teacher_id: teacherId,
          status: status!,
          notes: notes[studentId] || undefined,
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: 'Lessons Marked',
        description: `Successfully marked ${successCount} lesson(s)`,
      });
      setStudentStatuses({});
      setNotes({});
    }

    if (errorCount > 0) {
      toast({
        title: 'Some Errors Occurred',
        description: `${errorCount} lesson(s) could not be marked`,
        variant: 'destructive',
      });
    }
  };

  const isLoading = classesLoading || studentsLoading;

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Mark Lesson</h1>
          <p className="text-muted-foreground">Record attendance for your class</p>
        </div>

        {/* Class Selection */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : myClasses.length > 0 ? (
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {myClasses.map((cls) => (
                    <SelectItem key={cls.class_id} value={cls.class_id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground">No classes assigned to you</p>
            )}
          </CardContent>
        </Card>

        {/* Students List */}
        {selectedClassId && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Students in Class</CardTitle>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : classStudents.length > 0 ? (
                <div className="space-y-4">
                  {classStudents.map((student) => (
                    <div
                      key={student.student_id}
                      className={`p-4 rounded-lg border ${
                        student.status === 'Blocked' 
                          ? 'border-red-500/30 bg-red-500/5' 
                          : 'border-border/50 bg-card/50'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{student.name}</p>
                            <Badge
                              variant="outline"
                              className={
                                student.status === 'Active'
                                  ? 'status-active'
                                  : student.status === 'Grace'
                                  ? 'status-grace'
                                  : 'status-blocked'
                              }
                            >
                              {student.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className={`text-sm font-medium ${getWalletColor(student.wallet_balance || 0)}`}>
                              Wallet: {student.wallet_balance} lessons
                            </span>
                          </div>
                          {student.status === 'Blocked' && (
                            <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
                              <AlertTriangle className="w-4 h-4" />
                              <span>This student is blocked. Contact admin.</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={studentStatuses[student.student_id] === 'Taken' ? 'default' : 'outline'}
                            className={studentStatuses[student.student_id] === 'Taken' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={() => handleStatusChange(student.student_id, 'Taken')}
                            disabled={student.status === 'Blocked'}
                          >
                            Taken
                          </Button>
                          <Button
                            size="sm"
                            variant={studentStatuses[student.student_id] === 'Absent' ? 'default' : 'outline'}
                            className={studentStatuses[student.student_id] === 'Absent' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                            onClick={() => handleStatusChange(student.student_id, 'Absent')}
                          >
                            Absent
                          </Button>
                          <Button
                            size="sm"
                            variant={studentStatuses[student.student_id] === 'Cancelled' ? 'default' : 'outline'}
                            className={studentStatuses[student.student_id] === 'Cancelled' ? 'bg-neutral-600 hover:bg-neutral-700' : ''}
                            onClick={() => handleStatusChange(student.student_id, 'Cancelled')}
                          >
                            Cancelled
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4"
                    disabled={markLesson.isPending || Object.values(studentStatuses).every(s => s === null)}
                  >
                    {markLesson.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Submit Attendance
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No students in this class</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
