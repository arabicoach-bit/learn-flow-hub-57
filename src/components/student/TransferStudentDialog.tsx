import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTeachers } from '@/hooks/use-teachers';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';

interface TransferStudentDialogProps {
  studentId: string;
  studentName: string;
  currentTeacherId: string | null;
  currentTeacherName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferStudentDialog({
  studentId,
  studentName,
  currentTeacherId,
  currentTeacherName,
  open,
  onOpenChange,
}: TransferStudentDialogProps) {
  const { data: teachers } = useTeachers();
  const queryClient = useQueryClient();
  const [newTeacherId, setNewTeacherId] = useState('');
  const [notes, setNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const availableTeachers = teachers?.filter(
    (t) => t.is_active && t.teacher_id !== currentTeacherId
  );

  const selectedTeacher = availableTeachers?.find((t) => t.teacher_id === newTeacherId);

  const handleTransfer = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setIsTransferring(true);
    try {
      const { data, error } = await supabase.rpc('transfer_student', {
        p_student_id: studentId,
        p_new_teacher_id: newTeacherId,
        p_notes: notes || null,
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }

      toast.success(
        `${studentName} transferred to ${result.to_teacher}. ${result.lessons_moved} future lessons reassigned.`
      );

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer student');
    } finally {
      setIsTransferring(false);
    }
  };

  const resetForm = () => {
    setNewTeacherId('');
    setNotes('');
    setConfirmStep(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Transfer Student
          </DialogTitle>
          <DialogDescription>
            Transfer <strong>{studentName}</strong> to a different teacher. All future lessons will be reassigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current teacher info */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <Label className="text-xs text-muted-foreground">Current Teacher</Label>
            <p className="font-medium">{currentTeacherName}</p>
          </div>

          {/* New teacher selection */}
          <div className="space-y-2">
            <Label>Transfer to</Label>
            <Select value={newTeacherId} onValueChange={(v) => { setNewTeacherId(v); setConfirmStep(false); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select new teacher" />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers?.map((teacher) => (
                  <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Reason for transfer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Confirmation warning */}
          {confirmStep && selectedTeacher && (
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will transfer <strong>{studentName}</strong> from{' '}
                <strong>{currentTeacherName}</strong> to{' '}
                <strong>{selectedTeacher.name}</strong>. All future scheduled lessons
                will be reassigned. Past lessons remain unchanged. This action is logged.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!newTeacherId || isTransferring}
            variant={confirmStep ? 'destructive' : 'default'}
          >
            {isTransferring ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Transferring...</>
            ) : confirmStep ? (
              'Confirm Transfer'
            ) : (
              'Transfer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
