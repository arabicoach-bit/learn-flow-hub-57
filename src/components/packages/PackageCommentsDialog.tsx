import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePackageComments, useAddPackageComment, useEditPackageComment, useDeletePackageComment, useTogglePinPackageComment } from '@/hooks/use-package-comments';
import { useToast } from '@/hooks/use-toast';
import { CommentsThread } from '@/components/shared/CommentsThread';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadNoteAttachment } from '@/lib/upload-note-attachment';

interface PackageCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  packageLabel: string;
}

export function PackageCommentsDialog({ open, onOpenChange, packageId, packageLabel }: PackageCommentsDialogProps) {
  const { data: comments, isLoading } = usePackageComments(open ? packageId : null);
  const addComment = useAddPackageComment();
  const editComment = useEditPackageComment();
  const deleteComment = useDeletePackageComment();
  const togglePin = useTogglePinPackageComment();
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
            Package Notes — <span className="text-primary">{packageLabel}</span>
          </DialogTitle>
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
                  packageId,
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
                await editComment.mutateAsync({ commentId, comment, packageId });
              } catch {
                toast({ title: 'Failed to edit note', variant: 'destructive' });
              }
            }}
            onDelete={async (commentId) => {
              try {
                await deleteComment.mutateAsync({ commentId, packageId });
              } catch {
                toast({ title: 'Failed to delete note', variant: 'destructive' });
              }
            }}
            onTogglePin={async (commentId, pinned) => {
              try {
                await togglePin.mutateAsync({ commentId, pinned, packageId });
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
