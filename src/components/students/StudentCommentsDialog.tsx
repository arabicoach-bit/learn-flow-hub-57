import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStudentComments, useAddStudentComment, useEditStudentComment, useDeleteStudentComment, useTogglePinStudentComment } from '@/hooks/use-student-comments';
import { useToast } from '@/hooks/use-toast';
import { CommentsThread } from '@/components/shared/CommentsThread';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadNoteAttachment } from '@/lib/upload-note-attachment';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { exportJourneyHistory } from '@/lib/export-journey-pdf';

interface StudentCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function StudentCommentsDialog({ open, onOpenChange, studentId, studentName }: StudentCommentsDialogProps) {
  const { data: comments, isLoading } = useStudentComments(open ? studentId : null);
  const addComment = useAddStudentComment();
  const editComment = useEditStudentComment();
  const deleteComment = useDeleteStudentComment();
  const togglePin = useTogglePinStudentComment();
  const { toast } = useToast();
  const { role } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">
              Notes — <span className="text-primary">{studentName}</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => exportJourneyHistory(studentId, studentName)}
              title="Export full journey history"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </DialogHeader>
        <div className="px-5 py-3 flex-1 min-h-0">
          <CommentsThread
            comments={comments}
            isLoading={isLoading}
            currentUserId={userId}
            isAdmin={role === 'admin'}
            isAdding={addComment.isPending}
            onAdd={async (comment, attachment) => {
              try {
                await addComment.mutateAsync({
                  studentId,
                  comment,
                  attachmentUrl: attachment?.url,
                  attachmentName: attachment?.name,
                });
              } catch {
                toast({ title: 'Failed to add note', variant: 'destructive' });
              }
            }}
            onEdit={async (commentId, comment) => {
              try {
                await editComment.mutateAsync({ commentId, comment, studentId });
              } catch {
                toast({ title: 'Failed to edit note', variant: 'destructive' });
              }
            }}
            onDelete={async (commentId) => {
              try {
                await deleteComment.mutateAsync({ commentId, studentId });
              } catch {
                toast({ title: 'Failed to delete note', variant: 'destructive' });
              }
            }}
            onTogglePin={async (commentId, pinned) => {
              try {
                await togglePin.mutateAsync({ commentId, pinned, studentId });
              } catch {
                toast({ title: 'Failed to pin note', variant: 'destructive' });
              }
            }}
            onUploadAttachment={uploadNoteAttachment}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
