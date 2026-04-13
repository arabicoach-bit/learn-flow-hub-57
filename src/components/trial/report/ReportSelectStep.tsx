import { useMemo } from 'react';
import { BookOpen, Mic, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { CommentBankEntry } from '@/hooks/use-trial-reports';

interface CommentCheckListProps {
  comments: CommentBankEntry[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  maxSelect: number;
}

function CommentCheckList({ comments, selectedIds, onToggle, maxSelect }: CommentCheckListProps) {
  const selectedCount = comments.filter(c => selectedIds.has(c.comment_id)).length;
  return (
    <div className="space-y-1.5">
      {comments.map(c => {
        const isSelected = selectedIds.has(c.comment_id);
        const isDisabled = !isSelected && selectedCount >= maxSelect;
        return (
          <label
            key={c.comment_id}
            className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
              isSelected
                ? 'bg-primary/10 border-primary/40'
                : isDisabled
                ? 'opacity-40 cursor-not-allowed border-border bg-muted/30'
                : 'border-border hover:bg-accent/50'
            }`}
          >
            <Checkbox
              checked={isSelected}
              disabled={isDisabled}
              onCheckedChange={() => !isDisabled && onToggle(c.comment_id)}
              className="mt-0.5"
            />
            <span className={isSelected ? 'font-medium' : ''}>{c.comment_text}</span>
          </label>
        );
      })}
    </div>
  );
}

const LEVEL_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'general', label: 'General' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'elementary', label: 'Elementary' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const RECOMMENDED_LEVELS = [
  { value: 'none', label: 'No Recommendation' },
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Elementary', label: 'Elementary' },
  { value: 'Pre-Intermediate', label: 'Pre-Intermediate' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Upper-Intermediate', label: 'Upper-Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
];

interface ReportSelectStepProps {
  commentBank: CommentBankEntry[];
  bankLoading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  teacherNotes: string;
  onTeacherNotesChange: (v: string) => void;
  recommendedLevel: string;
  onRecommendedLevelChange: (v: string) => void;
  levelFilter: string;
  onLevelFilterChange: (v: string) => void;
  loadedReportId: string | null;
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onReset: () => void;
  selectionCounts: { rStr: number; rNext: number; sStr: number; sNext: number };
}

export function ReportSelectStep({
  commentBank,
  bankLoading,
  selectedIds,
  onToggle,
  teacherNotes,
  onTeacherNotesChange,
  recommendedLevel,
  onRecommendedLevelChange,
  levelFilter,
  onLevelFilterChange,
  loadedReportId,
  canGenerate,
  isGenerating,
  onGenerate,
  onReset,
  selectionCounts,
}: ReportSelectStepProps) {
  const filteredComments = useMemo(() => {
    const matchLevel = (c: CommentBankEntry) =>
      levelFilter === 'all' || c.level === levelFilter || c.level === 'general';
    const filter = (skill: string, type: string) =>
      commentBank.filter(c => c.skill === skill && c.comment_type === type && matchLevel(c));
    return {
      readingStrengths: filter('reading', 'strength'),
      readingNextSteps: filter('reading', 'next_step'),
      speakingStrengths: filter('speaking', 'strength'),
      speakingNextSteps: filter('speaking', 'next_step'),
    };
  }, [commentBank, levelFilter]);

  if (bankLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loadedReportId && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <FileText className="w-4 h-4 text-primary" />
          <span>Editing existing report — change selections and click "Update Report" to save.</span>
        </div>
      )}

      {/* Level filter + Recommended Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Filter Comments by Level</Label>
          <Select value={levelFilter} onValueChange={onLevelFilterChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Recommended Level (shown in PDF)</Label>
          <Select value={recommendedLevel || 'none'} onValueChange={v => onRecommendedLevelChange(v === 'none' ? '' : v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECOMMENDED_LEVELS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two-column layout: Reading | Speaking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Reading */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Reading</h3>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">✅ Strengths (select 1–5)</p>
            <CommentCheckList comments={filteredComments.readingStrengths} selectedIds={selectedIds} onToggle={onToggle} maxSelect={5} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">🎯 Next Steps (select 1–3)</p>
            <CommentCheckList comments={filteredComments.readingNextSteps} selectedIds={selectedIds} onToggle={onToggle} maxSelect={3} />
          </div>
        </div>

        {/* Speaking */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Conversation (Speaking & Listening)</h3>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">✅ Strengths (select 1–5)</p>
            <CommentCheckList comments={filteredComments.speakingStrengths} selectedIds={selectedIds} onToggle={onToggle} maxSelect={5} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">🎯 Next Steps (select 1–3)</p>
            <CommentCheckList comments={filteredComments.speakingNextSteps} selectedIds={selectedIds} onToggle={onToggle} maxSelect={3} />
          </div>
        </div>
      </div>

      {/* Teacher Notes */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">📝 Teacher Notes (optional — will appear in the report)</p>
        <Textarea
          placeholder="Add any personal observation about the student..."
          value={teacherNotes}
          onChange={(e) => onTeacherNotesChange(e.target.value)}
          className="min-h-[70px] resize-none"
        />
      </div>

      {/* Selection counters + Generate */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={selectionCounts.rStr >= 1 ? 'text-emerald-500 font-medium' : ''}>R✅ {selectionCounts.rStr}</span>
          <span className={selectionCounts.rNext >= 1 ? 'text-emerald-500 font-medium' : ''}>R🎯 {selectionCounts.rNext}</span>
          <span className={selectionCounts.sStr >= 1 ? 'text-emerald-500 font-medium' : ''}>S✅ {selectionCounts.sStr}</span>
          <span className={selectionCounts.sNext >= 1 ? 'text-emerald-500 font-medium' : ''}>S🎯 {selectionCounts.sNext}</span>
        </div>
        <div className="flex gap-2">
          {loadedReportId && (
            <Button variant="outline" onClick={onReset}>Start Fresh</Button>
          )}
          <Button onClick={onGenerate} disabled={!canGenerate || isGenerating} size="lg">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {loadedReportId ? 'Updating...' : 'Generating...'}</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> {loadedReportId ? 'Update Report' : 'Generate Report'}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
