import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { useStudentComments, useAddStudentComment } from '@/hooks/use-student-comments';
import { useToast } from '@/hooks/use-toast';

interface StudentCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function StudentCommentsDialog({ open, onOpenChange, studentId, studentName }: StudentCommentsDialogProps) {
  const [newComment, setNewComment] = useState('');
  const { data: comments, isLoading } = useStudentComments(open ? studentId : null);
  const addComment = useAddStudentComment();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    addComment.mutate(
      { studentId, comment: trimmed },
      {
        onSuccess: () => setNewComment(''),
        onError: () => toast({ title: 'Failed to add comment', variant: 'destructive' }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">
            Comments — <span className="text-primary">{studentName}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-5 py-3" ref={scrollRef as any}>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))
            ) : !comments?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first to add one!</p>
            ) : (
              comments.map((c) => (
                <div key={c.comment_id} className="rounded-lg bg-muted/50 px-3.5 py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {c.profiles?.full_name || 'System'}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(c.created_at), 'dd MMM yyyy · HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{c.comment}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-3 flex gap-2">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            className="shrink-0 h-10 w-10"
            disabled={!newComment.trim() || addComment.isPending}
            onClick={handleSubmit}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
