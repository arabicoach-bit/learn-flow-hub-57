import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLeadComments, useAddLeadComment, useEditLeadComment, useDeleteLeadComment, useTogglePinLeadComment } from '@/hooks/use-lead-comments';
import { useToast } from '@/hooks/use-toast';
import { CommentsThread } from '@/components/shared/CommentsThread';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeadCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
}

export function LeadCommentsDialog({ open, onOpenChange, leadId, leadName }: LeadCommentsDialogProps) {
  const { data: comments, isLoading } = useLeadComments(open ? leadId : null);
  const addComment = useAddLeadComment();
  const editComment = useEditLeadComment();
  const deleteComment = useDeleteLeadComment();
  const togglePin = useTogglePinLeadComment();
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
            Lead Notes — <span className="text-primary">{leadName}</span>
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
                await addComment.mutateAsync({ leadId, comment });
              } catch {
                toast({ title: 'Failed to add note', variant: 'destructive' });
              }
            }}
            onEdit={async (commentId, comment) => {
              try {
                await editComment.mutateAsync({ commentId, comment, leadId });
              } catch {
                toast({ title: 'Failed to edit note', variant: 'destructive' });
              }
            }}
            onDelete={async (commentId) => {
              try {
                await deleteComment.mutateAsync({ commentId, leadId });
              } catch {
                toast({ title: 'Failed to delete note', variant: 'destructive' });
              }
            }}
            onTogglePin={async (commentId, pinned) => {
              try {
                await togglePin.mutateAsync({ commentId, pinned, leadId });
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
