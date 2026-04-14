import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, Pin, PinOff, MoreVertical, Pencil, Trash2, Filter, MessageSquare, Activity, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface CommentItem {
  comment_id: string;
  comment: string;
  created_at: string;
  author_id: string | null;
  is_pinned?: boolean;
  updated_at?: string | null;
  profiles?: { full_name: string } | null;
}

type FilterMode = 'all' | 'notes' | 'activity';

interface CommentsThreadProps {
  comments: CommentItem[] | undefined;
  isLoading: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  onAdd: (comment: string) => Promise<void> | void;
  onDelete?: (commentId: string) => Promise<void> | void;
  onEdit?: (commentId: string, newComment: string) => Promise<void> | void;
  onTogglePin?: (commentId: string, pinned: boolean) => Promise<void> | void;
  isAdding?: boolean;
}

function isSystemComment(comment: string) {
  return comment.startsWith('🔄') || comment.startsWith('🔗') || comment.startsWith('📋');
}

function isJourneyComment(comment: string) {
  return comment.startsWith('🔗');
}

function isCreationComment(comment: string) {
  return comment.startsWith('📋');
}

export function CommentsThread({
  comments,
  isLoading,
  currentUserId,
  isAdmin,
  onAdd,
  onDelete,
  onEdit,
  onTogglePin,
  isAdding,
}: CommentsThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const sortedComments = useMemo(() => {
    if (!comments) return [];
    let filtered = comments;
    if (filter === 'notes') {
      filtered = comments.filter(c => !isSystemComment(c.comment));
    } else if (filter === 'activity') {
      filtered = comments.filter(c => isSystemComment(c.comment));
    }
    // Pinned first, then by date
    return [...filtered].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [comments, filter]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await onAdd(newComment.trim());
    setNewComment('');
  };

  const handleEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await onEdit?.(editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const canModify = (c: CommentItem) => {
    if (isSystemComment(c.comment)) return false;
    if (isAdmin) return true;
    return c.author_id === currentUserId;
  };

  const filterCounts = useMemo(() => {
    if (!comments) return { all: 0, notes: 0, activity: 0 };
    return {
      all: comments.length,
      notes: comments.filter(c => !isSystemComment(c.comment)).length,
      activity: comments.filter(c => isSystemComment(c.comment)).length,
    };
  }, [comments]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Filter bar */}
      <div className="flex gap-1.5 px-1">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setFilter('all')}
        >
          <Filter className="h-3 w-3" />
          All ({filterCounts.all})
        </Button>
        <Button
          variant={filter === 'notes' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setFilter('notes')}
        >
          <MessageSquare className="h-3 w-3" />
          Notes ({filterCounts.notes})
        </Button>
        <Button
          variant={filter === 'activity' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setFilter('activity')}
        >
          <Activity className="h-3 w-3" />
          Activity ({filterCounts.activity})
        </Button>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1 min-h-0 h-[260px] pr-3" ref={scrollRef as any}>
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))
          ) : !sortedComments.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {filter === 'notes' ? 'No manual notes yet' : filter === 'activity' ? 'No activity logged yet' : 'No notes yet'}
            </p>
          ) : (
            sortedComments.map((c) => {
              const isSystem = isSystemComment(c.comment);
              const isJourney = isJourneyComment(c.comment);
              const isEditing = editingId === c.comment_id;

              return (
                <div
                  key={c.comment_id}
                  className={cn(
                    'rounded-lg px-3 py-2 group relative',
                    c.is_pinned && 'ring-1 ring-primary/30',
                    isJourney
                      ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                      : isSystem
                        ? 'bg-muted/30 border-l-2 border-muted-foreground/20'
                        : 'bg-muted/50'
                  )}
                >
                  {/* Pinned badge */}
                  {c.is_pinned && (
                    <Badge variant="outline" className="absolute -top-2 right-2 text-[9px] h-4 bg-background gap-0.5">
                      <Pin className="h-2.5 w-2.5" /> Pinned
                    </Badge>
                  )}

                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      {isJourney && <ArrowRight className="h-3 w-3 text-blue-500" />}
                      <span className={cn(
                        'text-xs font-medium',
                        isSystem ? 'text-muted-foreground' : 'text-foreground/80'
                      )}>
                        {c.profiles?.full_name || 'System'}
                      </span>
                      {isSystem && !isJourney && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">Auto</Badge>
                      )}
                      {isJourney && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Link</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(c.created_at), 'dd MMM yyyy, HH:mm')}
                        {c.updated_at && ' (edited)'}
                      </span>
                      {canModify(c) && (onDelete || onEdit || onTogglePin) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            {onEdit && (
                              <DropdownMenuItem onClick={() => { setEditingId(c.comment_id); setEditText(c.comment); }}>
                                <Pencil className="h-3 w-3 mr-2" /> Edit
                              </DropdownMenuItem>
                            )}
                            {onTogglePin && (
                              <DropdownMenuItem onClick={() => onTogglePin(c.comment_id, !c.is_pinned)}>
                                {c.is_pinned ? <PinOff className="h-3 w-3 mr-2" /> : <Pin className="h-3 w-3 mr-2" />}
                                {c.is_pinned ? 'Unpin' : 'Pin'}
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.comment_id)}>
                                <Trash2 className="h-3 w-3 mr-2" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex gap-2 mt-1">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[40px] text-sm"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={handleEdit}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className={cn(
                      'text-sm whitespace-pre-wrap leading-relaxed',
                      isSystem ? 'text-muted-foreground' : 'text-foreground/90'
                    )}>
                      {c.comment}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a note..."
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
          disabled={!newComment.trim() || isAdding}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { onDelete?.(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
