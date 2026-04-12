import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { Plus, Pencil, Trash2, BookOpen, Mic, Loader2 } from 'lucide-react';
import { useCommentBank } from '@/hooks/use-trial-reports';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type SkillFilter = 'all' | 'reading' | 'speaking';
type TypeFilter = 'all' | 'strength' | 'next_step';

export default function ReportCommentBank() {
  const { data: comments = [], isLoading } = useCommentBank();
  const queryClient = useQueryClient();

  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editDialog, setEditDialog] = useState<{ open: boolean; comment?: any }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formSkill, setFormSkill] = useState('reading');
  const [formType, setFormType] = useState('strength');
  const [formText, setFormText] = useState('');
  const [formOrder, setFormOrder] = useState(0);

  const filtered = comments.filter(c => {
    if (skillFilter !== 'all' && c.skill !== skillFilter) return false;
    if (typeFilter !== 'all' && c.comment_type !== typeFilter) return false;
    return true;
  });

  const openAdd = () => {
    setFormSkill('reading');
    setFormType('strength');
    setFormText('');
    setFormOrder(comments.length + 1);
    setEditDialog({ open: true });
  };

  const openEdit = (c: any) => {
    setFormSkill(c.skill);
    setFormType(c.comment_type);
    setFormText(c.comment_text);
    setFormOrder(c.display_order);
    setEditDialog({ open: true, comment: c });
  };

  const handleSave = async () => {
    if (!formText.trim()) return;
    setSaving(true);
    try {
      if (editDialog.comment) {
        const { error } = await supabase
          .from('report_comment_bank')
          .update({
            skill: formSkill,
            comment_type: formType,
            comment_text: formText.trim(),
            display_order: formOrder,
          })
          .eq('comment_id', editDialog.comment.comment_id);
        if (error) throw error;
        toast.success('Comment updated');
      } else {
        const { error } = await supabase
          .from('report_comment_bank')
          .insert({
            skill: formSkill,
            level: 'general',
            comment_type: formType,
            comment_text: formText.trim(),
            display_order: formOrder,
          });
        if (error) throw error;
        toast.success('Comment added');
      }
      queryClient.invalidateQueries({ queryKey: ['report-comment-bank'] });
      setEditDialog({ open: false });
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeleting(commentId);
    try {
      const { error } = await supabase
        .from('report_comment_bank')
        .update({ is_active: false })
        .eq('comment_id', commentId);
      if (error) throw error;
      toast.success('Comment deactivated');
      queryClient.invalidateQueries({ queryKey: ['report-comment-bank'] });
    } catch (err: any) {
      toast.error('Failed to delete', { description: err.message });
    } finally {
      setDeleting(null);
    }
  };

  const readingCount = comments.filter(c => c.skill === 'reading').length;
  const speakingCount = comments.filter(c => c.skill === 'speaking').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Report Comment Bank</h1>
            <p className="text-sm text-muted-foreground">Manage the comments teachers select when generating trial lesson reports.</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Comment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{comments.length}</div>
              <p className="text-xs text-muted-foreground">Total Comments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="text-2xl font-bold">{readingCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Reading</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-500" />
                <span className="text-2xl font-bold">{speakingCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Speaking & Listening</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{comments.filter(c => c.comment_type === 'strength').length}</div>
              <p className="text-xs text-muted-foreground">Strengths / {comments.filter(c => c.comment_type === 'next_step').length} Next Steps</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={skillFilter} onValueChange={(v) => setSkillFilter(v as SkillFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              <SelectItem value="reading">Reading</SelectItem>
              <SelectItem value="speaking">Speaking & Listening</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="strength">Strengths</SelectItem>
              <SelectItem value="next_step">Next Steps</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead className="w-[100px]">Skill</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c, i) => (
                    <TableRow key={c.comment_id}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.skill === 'reading' ? 'border-blue-500/30 text-blue-500' : 'border-purple-500/30 text-purple-500'}>
                          {c.skill === 'reading' ? '📖 Reading' : '🗣️ Speaking'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.comment_type === 'strength' ? 'border-green-500/30 text-green-500' : 'border-amber-500/30 text-amber-500'}>
                          {c.comment_type === 'strength' ? '✅ Strength' : '🎯 Next Step'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.comment_text}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            disabled={deleting === c.comment_id}
                            onClick={() => handleDelete(c.comment_id)}
                          >
                            {deleting === c.comment_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No comments found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialog.comment ? 'Edit Comment' : 'Add New Comment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Skill</Label>
                <Select value={formSkill} onValueChange={setFormSkill}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="speaking">Speaking & Listening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="next_step">Next Step</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Comment Text</Label>
              <Textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="The student can..."
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formText.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editDialog.comment ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
