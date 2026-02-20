import { useState, useEffect } from 'react';
import { useClasses } from '@/hooks/use-classes';
import { useStudents } from '@/hooks/use-students';
import { useMarkLesson } from '@/hooks/use-lessons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Ban, AlertTriangle } from 'lucide-react';
import { getWalletColor, getWalletBgColor, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { supabase } from '@/integrations/supabase/client';

interface StudentLessonStatus {
  student_id: string;
  name: string;
  wallet_balance: number;
  status: 'Active' | 'Grace' | 'Blocked';
  lessonStatus: 'Taken' | 'Absent' | null;
  selected: boolean;
}

export function MarkLessonForm() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [studentStatuses, setStudentStatuses] = useState<StudentLessonStatus[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const markLesson = useMarkLesson();

  const selectedClass = classes?.find(c => c.class_id === selectedClassId);

  // Update student statuses when students data changes
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setStudentStatuses([]);
  };

  // Populate students when class is selected
  useEffect(() => {
    if (students && selectedClassId) {
      // Filter students by selected class's teacher
      const selectedClass = classes?.find(c => c.class_id === selectedClassId);
      const classStudents = students.filter(s => s.teacher_id === selectedClass?.teacher_id);
      
      setStudentStatuses(classStudents.map(s => ({
        student_id: s.student_id,
        name: s.name,
        wallet_balance: s.wallet_balance,
        status: s.status,
        lessonStatus: null,
        selected: false,
      })));
    }
  }, [students, selectedClassId, classes]);

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    const student = studentStatuses.find(s => s.student_id === studentId);
    
    // Prevent selecting blocked students
    if (student?.status === 'Blocked') {
      toast.error(`Cannot select ${student.name} - student is BLOCKED. Contact admin.`);
      return;
    }
    
    setStudentStatuses(prev => prev.map(s => 
      s.student_id === studentId 
        ? { ...s, selected: checked, lessonStatus: checked ? 'Taken' : null }
        : s
    ));
  };

  const handleStatusChange = (studentId: string, status: 'Taken' | 'Absent') => {
    setStudentStatuses(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, lessonStatus: status } : s
    ));
  };

  const handleSubmit = async () => {
    const selectedStudents = studentStatuses.filter(s => s.selected && s.lessonStatus);
    
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student and set their status');
      return;
    }

    if (!selectedClass?.teacher_id) {
      toast.error('Selected class has no teacher assigned');
      return;
    }

    // Re-validate student statuses from database before submission
    const studentIds = selectedStudents.map(s => s.student_id);
    const { data: currentStudents, error: fetchError } = await supabase
      .from('students')
      .select('student_id, name, status')
      .in('student_id', studentIds);

    if (fetchError) {
      toast.error('Failed to validate student statuses');
      return;
    }

    // Check for any blocked students
    const blockedStudents = currentStudents?.filter(s => s.status === 'Blocked') || [];
    if (blockedStudents.length > 0) {
      const names = blockedStudents.map(s => s.name).join(', ');
      toast.error(`Cannot mark lessons for blocked students: ${names}`);
      
      // Update local state to reflect current blocked status
      setStudentStatuses(prev => prev.map(s => {
        const current = currentStudents?.find(cs => cs.student_id === s.student_id);
        if (current && current.status === 'Blocked') {
          return { ...s, status: 'Blocked', selected: false, lessonStatus: null };
        }
        return s;
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      for (const student of selectedStudents) {
        await markLesson.mutateAsync({
          student_id: student.student_id,
          class_id: selectedClassId,
          teacher_id: selectedClass.teacher_id,
          status: student.lessonStatus!,
          notes: notes || undefined,
        });
      }

      toast.success(`Successfully marked ${selectedStudents.length} lesson(s)`);
      setStudentStatuses(prev => prev.map(s => ({ ...s, selected: false, lessonStatus: null })));
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark lessons');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Mark Lesson
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label>Select Class</Label>
            <Select value={selectedClassId} onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue placeholder={classesLoading ? 'Loading...' : 'Choose a class'} />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((cls) => (
                  <SelectItem key={cls.class_id} value={cls.class_id}>
                    {cls.name} {cls.teachers?.name ? `(${cls.teachers.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Students List with Status */}
          {selectedClassId && (
            <div className="space-y-4">
              <Label>Students in Class</Label>
              {studentsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading students...
                </div>
              ) : studentStatuses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No students found in this class</p>
              ) : (
                <div className="space-y-3">
                  {studentStatuses.map((student) => {
                    const isBlocked = student.status === 'Blocked';
                    
                    return (
                      <div 
                        key={student.student_id} 
                        className={`p-4 rounded-lg border transition-colors ${
                          isBlocked 
                            ? 'border-destructive/50 bg-destructive/5 opacity-75 cursor-not-allowed' 
                            : student.selected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border/50 bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Checkbox
                                  id={student.student_id}
                                  checked={student.selected}
                                  onCheckedChange={(checked) => handleStudentSelect(student.student_id, checked as boolean)}
                                  disabled={isBlocked}
                                  className={isBlocked ? 'cursor-not-allowed opacity-50' : ''}
                                />
                              </div>
                            </TooltipTrigger>
                            {isBlocked && (
                              <TooltipContent side="right" className="bg-destructive text-destructive-foreground">
                                <p>This student has exceeded the debt limit.</p>
                                <p>Payment required before lessons can be marked.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <label 
                                htmlFor={student.student_id} 
                                className={`font-medium flex items-center gap-2 ${isBlocked ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {student.name}
                                {isBlocked && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                                    <Ban className="w-3 h-3" />
                                    {getStatusDisplayLabel('Blocked').toUpperCase()} - Contact Admin
                                  </span>
                                )}
                                {student.status === 'Grace' && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                                    <AlertTriangle className="w-3 h-3" />
                                    {getStatusDisplayLabel('Grace')}
                                  </span>
                                )}
                              </label>
                              <span 
                                className={`text-sm font-medium px-2 py-0.5 rounded ${getWalletBgColor(student.wallet_balance)} ${getWalletColor(student.wallet_balance)}`}
                              >
                                Balance: {student.wallet_balance}
                              </span>
                            </div>
                            
                            {student.selected && !isBlocked && (
                              <RadioGroup
                                value={student.lessonStatus || ''}
                                onValueChange={(value) => handleStatusChange(student.student_id, value as any)}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Taken" id={`${student.student_id}-taken`} />
                                  <Label htmlFor={`${student.student_id}-taken`} className="cursor-pointer text-sm font-normal">
                                    Taken
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Absent" id={`${student.student_id}-absent`} />
                                  <Label htmlFor={`${student.student_id}-absent`} className="cursor-pointer text-sm font-normal">
                                    Absent
                                  </Label>
                                </div>
                              </RadioGroup>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {selectedClassId && studentStatuses.some(s => s.selected) && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about today's lesson..."
                rows={3}
              />
            </div>
          )}

          {/* Submit Button */}
          {selectedClassId && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !studentStatuses.some(s => s.selected)}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Marking Lessons...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Selected Lessons
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
