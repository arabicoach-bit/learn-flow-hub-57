import { useState } from 'react';
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
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { getWalletColor } from '@/lib/wallet-utils';

interface StudentLessonStatus {
  student_id: string;
  name: string;
  wallet_balance: number;
  status: 'Active' | 'Grace' | 'Blocked';
  lessonStatus: 'Taken' | 'Absent' | 'Cancelled' | null;
  selected: boolean;
}

export function MarkLessonForm() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [studentStatuses, setStudentStatuses] = useState<StudentLessonStatus[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: students, isLoading: studentsLoading } = useStudents(
    selectedClassId ? { class_id: selectedClassId } : undefined
  );
  const markLesson = useMarkLesson();

  const selectedClass = classes?.find(c => c.class_id === selectedClassId);

  // Update student statuses when students data changes
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setStudentStatuses([]);
  };

  // Populate students when data loads
  if (students && selectedClassId && studentStatuses.length === 0 && students.length > 0) {
    setStudentStatuses(students.map(s => ({
      student_id: s.student_id,
      name: s.name,
      wallet_balance: s.wallet_balance,
      status: s.status,
      lessonStatus: null,
      selected: false,
    })));
  }

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    setStudentStatuses(prev => prev.map(s => 
      s.student_id === studentId 
        ? { ...s, selected: checked, lessonStatus: checked ? 'Taken' : null }
        : s
    ));
  };

  const handleStatusChange = (studentId: string, status: 'Taken' | 'Absent' | 'Cancelled') => {
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

    // Check for blocked students trying to take lessons
    const blockedTaking = selectedStudents.filter(s => s.status === 'Blocked' && s.lessonStatus === 'Taken');
    if (blockedTaking.length > 0) {
      toast.error(`Cannot mark lesson as taken for blocked student(s): ${blockedTaking.map(s => s.name).join(', ')}`);
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
                {studentStatuses.map((student) => (
                  <div 
                    key={student.student_id} 
                    className={`p-4 rounded-lg border transition-colors ${
                      student.selected ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/30'
                    } ${student.status === 'Blocked' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={student.student_id}
                        checked={student.selected}
                        onCheckedChange={(checked) => handleStudentSelect(student.student_id, checked as boolean)}
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <label 
                            htmlFor={student.student_id} 
                            className="font-medium cursor-pointer flex items-center gap-2"
                          >
                            {student.name}
                            {student.status === 'Blocked' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                                BLOCKED
                              </span>
                            )}
                          </label>
                          <span 
                            className="text-sm font-medium px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `hsl(${getWalletColor(student.wallet_balance)} / 0.15)`,
                              color: `hsl(${getWalletColor(student.wallet_balance)})`
                            }}
                          >
                            Balance: {student.wallet_balance}
                          </span>
                        </div>
                        
                        {student.selected && (
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
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Cancelled" id={`${student.student_id}-cancelled`} />
                              <Label htmlFor={`${student.student_id}-cancelled`} className="cursor-pointer text-sm font-normal">
                                Cancelled
                              </Label>
                            </div>
                          </RadioGroup>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
  );
}
