import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { useLeadComments, useAddLeadComment } from '@/hooks/use-lead-comments';
import { useToast } from '@/hooks/use-toast';

interface LeadCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
}

export function LeadCommentsDialog({ open, onOpenChange, leadId, leadName }: LeadCommentsDialogProps) {
  const [newComment, setNewComment] = useState('');
  const { data: comments, isLoading } = useLeadComments(open ? leadId : null);
  const addComment = useAddLeadComment();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment.mutateAsync({ leadId, comment: newComment.trim() });
      setNewComment('');
    } catch {
      toast({ title: 'Error', description: 'Failed to add note', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Lead Notes — {leadName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <ScrollArea className="h-[280px] pr-3" ref={scrollRef as any}>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-3/4" />
              </div>
            ) : !comments?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
            ) : (
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.comment_id} className="rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-foreground/80">{c.profiles?.full_name || 'System'}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a note..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            />
            <Button size="icon" className="shrink-0 self-end" onClick={handleSubmit} disabled={!newComment.trim() || addComment.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
