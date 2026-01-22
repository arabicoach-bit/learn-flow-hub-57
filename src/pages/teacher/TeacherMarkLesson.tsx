import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useTeacherStudents } from '@/hooks/use-teacher-dashboard';
import { useMarkLesson } from '@/hooks/use-lessons';
import { getWalletColor } from '@/lib/wallet-utils';
import { CheckSquare, AlertTriangle, Loader2, Ban, Search } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type LessonStatus = 'Taken' | 'Absent' | 'Cancelled';

interface StudentLessonState {
  [studentId: string]: LessonStatus | null;
}

export default function TeacherMarkLesson() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const teacherId = profile?.teacher_id;

  const [searchQuery, setSearchQuery] = useState('');
  const [studentStatuses, setStudentStatuses] = useState<StudentLessonState>({});
  const [notes, setNotes] = useState<{ [studentId: string]: string }>({});

  // Get all students assigned to this teacher (no class filter needed)
  const { data: students, isLoading: studentsLoading } = useTeacherStudents();
  
  // Filter students by search query
  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.programs?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const markLesson = useMarkLesson();

  const handleStatusChange = (studentId: string, status: LessonStatus) => {
    const student = filteredStudents.find(s => s.student_id === studentId);
    
    // Prevent selecting "Taken" for blocked students
    if (status === 'Taken' && student?.status === 'Blocked') {
      toast({
        title: 'Cannot Mark as Taken',
        description: `${student.name} is blocked. Only Absent or Cancelled can be marked.`,
        variant: 'destructive',
      });
      return;
    }
    
    setStudentStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!teacherId) {
      toast({
        title: 'Error',
        description: 'Teacher ID not found',
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

    // Re-validate student statuses from database before submission
    const studentIds = studentsToMark.map(([id]) => id);
    const { data: currentStudents, error: fetchError } = await supabase
      .from('students')
      .select('student_id, name, status')
      .in('student_id', studentIds);

    if (fetchError) {
      toast({
        title: 'Validation Error',
        description: 'Failed to validate student statuses',
        variant: 'destructive',
      });
      return;
    }

    // Check for blocked students trying to take lessons
    const blockedWithTaken = studentsToMark.filter(([id, status]) => {
      const student = currentStudents?.find(s => s.student_id === id);
      return student?.status === 'Blocked' && status === 'Taken';
    });

    if (blockedWithTaken.length > 0) {
      const blockedNames = blockedWithTaken
        .map(([id]) => currentStudents?.find(s => s.student_id === id)?.name)
        .join(', ');
      toast({
        title: 'Cannot Mark Lessons',
        description: `Blocked students cannot take lessons: ${blockedNames}`,
        variant: 'destructive',
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [studentId, status] of studentsToMark) {
      try {
        await markLesson.mutateAsync({
          student_id: studentId,
          class_id: null as any, // class_id is now optional
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

  return (
    <TooltipProvider>
      <TeacherLayout>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Mark Lesson</h1>
            <p className="text-muted-foreground">Record attendance for your students</p>
          </div>

          {/* Search */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search students by name or programme..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Students List - All assigned students */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-500" />
                My Students ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="space-y-4">
                  {filteredStudents.map((student) => {
                    const isBlocked = student.status === 'Blocked';
                    
                    return (
                      <div
                        key={student.student_id}
                        className={`p-4 rounded-lg border ${
                          isBlocked 
                            ? 'border-destructive/50 bg-destructive/5 opacity-75' 
                            : 'border-border/50 bg-card/50'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-medium ${isBlocked ? 'text-muted-foreground' : ''}`}>
                                {student.name}
                              </p>
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
                              {student.programs?.name && (
                                <Badge variant="secondary" className="text-xs">
                                  {student.programs.name}
                                </Badge>
                              )}
                              {student.student_level && (
                                <Badge variant="outline" className="text-xs">
                                  {student.student_level}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className={`text-sm font-medium ${getWalletColor(student.wallet_balance || 0)}`}>
                                Wallet: {student.wallet_balance} lessons
                              </span>
                            </div>
                            {isBlocked && (
                              <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
                                <Ban className="w-4 h-4" />
                                <span>🚫 BLOCKED - Contact Admin for payment</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    variant={studentStatuses[student.student_id] === 'Taken' ? 'default' : 'outline'}
                                    className={studentStatuses[student.student_id] === 'Taken' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                                    onClick={() => handleStatusChange(student.student_id, 'Taken')}
                                    disabled={isBlocked}
                                  >
                                    Taken
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {isBlocked && (
                                <TooltipContent className="bg-destructive text-destructive-foreground">
                                  <p>Student exceeded debt limit.</p>
                                  <p>Payment required before lessons.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
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
                    );
                  })}

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
                <p className="text-muted-foreground text-center py-8">
                  {searchQuery ? 'No students match your search' : 'No students assigned to you'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TeacherLayout>
    </TooltipProvider>
  );
}
