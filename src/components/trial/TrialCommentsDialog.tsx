import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTrialComments, useAddTrialComment, useEditTrialComment, useDeleteTrialComment, useTogglePinTrialComment } from '@/hooks/use-trial-comments';
import { useToast } from '@/hooks/use-toast';
import { CommentsThread } from '@/components/shared/CommentsThread';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrialCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialId: string;
  studentName: string;
}

export function TrialCommentsDialog({ open, onOpenChange, trialId, studentName }: TrialCommentsDialogProps) {
  const { data: comments, isLoading } = useTrialComments(open ? trialId : null);
  const addComment = useAddTrialComment();
  const editComment = useEditTrialComment();
  const deleteComment = useDeleteTrialComment();
  const togglePin = useTogglePinTrialComment();
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
          <DialogTitle className="text-base">
            Trial Notes — <span className="text-primary">{studentName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="px-5 py-3 flex-1 min-h-0">
          <CommentsThread
            comments={comments}
            isLoading={isLoading}
            currentUserId={userId}
            isAdmin={role === 'admin'}
            isAdding={addComment.isPending}
            onAdd={async (comment) => {
              try {
                await addComment.mutateAsync({ trialId, comment });
              } catch {
                toast({ title: 'Failed to add note', variant: 'destructive' });
              }
            }}
            onEdit={async (commentId, comment) => {
              try {
                await editComment.mutateAsync({ commentId, comment, trialId });
              } catch {
                toast({ title: 'Failed to edit note', variant: 'destructive' });
              }
            }}
            onDelete={async (commentId) => {
              try {
                await deleteComment.mutateAsync({ commentId, trialId });
              } catch {
                toast({ title: 'Failed to delete note', variant: 'destructive' });
              }
            }}
            onTogglePin={async (commentId, pinned) => {
              try {
                await togglePin.mutateAsync({ commentId, pinned, trialId });
              } catch {
                toast({ title: 'Failed to pin note', variant: 'destructive' });
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
