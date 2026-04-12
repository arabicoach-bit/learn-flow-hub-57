import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Mic, Sparkles, FileText, Copy, Check, Loader2, ChevronRight, Download } from 'lucide-react';
import { useCommentBank, useSaveTrialReport, usePolishReport, useTrialReports, type CommentBankEntry } from '@/hooks/use-trial-reports';
import { generateTrialReportPdf, type TrialReportPdfData } from '@/lib/trial-report-pdf';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TrialReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialId: string;
  studentName: string;
  trialInfo?: {
    teacherName?: string;
    program?: string;
    trialDate?: string;
    trialTime?: string;
    duration?: number;
    age?: number | null;
    yearGroup?: string | null;
  };
}

type Skill = 'reading' | 'speaking';

export function TrialReportDialog({ open, onOpenChange, trialId, studentName, trialInfo }: TrialReportDialogProps) {
  const { data: commentBank = [], isLoading: bankLoading } = useCommentBank();
  const { data: existingReports = [] } = useTrialReports(trialId);
  const saveReport = useSaveTrialReport();
  const polishReport = usePolishReport();

  const [step, setStep] = useState<'select' | 'preview' | 'history'>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teacherNotes, setTeacherNotes] = useState('');
  const [generatedReport, setGeneratedReport] = useState<{ reportId: string; text: string; isPolished: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredComments = useMemo(() => {
    const filter = (skill: Skill, type: 'strength' | 'next_step') =>
      commentBank.filter(c => c.skill === skill && c.comment_type === type);
    return {
      readingStrengths: filter('reading', 'strength'),
      readingNextSteps: filter('reading', 'next_step'),
      speakingStrengths: filter('speaking', 'strength'),
      speakingNextSteps: filter('speaking', 'next_step'),
    };
  }, [commentBank]);

  const selectedComments = useMemo(() =>
    commentBank.filter(c => selectedIds.has(c.comment_id)),
    [commentBank, selectedIds]
  );

  const toggleComment = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canGenerate = () => {
    const rStr = selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'strength').length;
    const rNext = selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'next_step').length;
    const sStr = selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'strength').length;
    const sNext = selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'next_step').length;
    return rStr >= 1 && rNext >= 1 && sStr >= 1 && sNext >= 1;
  };

  const handleGenerate = async () => {
    try {
      const mapped = selectedComments.map(c => ({
        commentId: c.comment_id,
        skill: c.skill,
        type: c.comment_type,
        text: c.comment_text,
      }));
      const result = await saveReport.mutateAsync({
        trialId,
        selectedComments: mapped,
        studentName,
        teacherNotes: teacherNotes.trim() || undefined,
      });
      setGeneratedReport({ reportId: result.report_id, text: result.final_text, isPolished: false });
      setStep('preview');
      toast.success('Report generated!');
    } catch (err: any) {
      toast.error('Failed to generate report', { description: err.message });
    }
  };

  const handlePolish = async () => {
    if (!generatedReport) return;
    try {
      const polishedText = await polishReport.mutateAsync({
        reportId: generatedReport.reportId,
        trialId,
        templateText: generatedReport.text,
        studentName,
      });
      setGeneratedReport({ ...generatedReport, text: polishedText, isPolished: true });
      toast.success('Report polished with AI!');
    } catch (err: any) {
      toast.error('Failed to polish report', { description: err.message });
    }
  };

  const handleCopy = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport.text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime12h = (time: string | undefined) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const buildPdfData = (text: string): TrialReportPdfData => ({
    studentName,
    teacherName: trialInfo?.teacherName || 'N/A',
    program: trialInfo?.program || 'N/A',
    trialDate: trialInfo?.trialDate ? format(new Date(trialInfo.trialDate), 'dd MMM yyyy') : 'N/A',
    trialTime: formatTime12h(trialInfo?.trialTime),
    duration: `${trialInfo?.duration || 30} minutes`,
    age: trialInfo?.age ? String(trialInfo.age) : '',
    yearGroup: trialInfo?.yearGroup || '',
    readingStrengths: selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'strength').map(c => c.comment_text),
    readingNextSteps: selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'next_step').map(c => c.comment_text),
    speakingStrengths: selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'strength').map(c => c.comment_text),
    speakingNextSteps: selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'next_step').map(c => c.comment_text),
    teacherNotes: teacherNotes.trim(),
    finalText: text,
  });

  const handleDownloadPdf = (text?: string) => {
    const finalText = text || generatedReport?.text || '';
    const pdfData = buildPdfData(finalText);
    const doc = generateTrialReportPdf(pdfData);
    doc.save(`Trial_Report_${studentName.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded!');
  };

  const handleDownloadHistoryPdf = (report: any) => {
    const comments = Array.isArray(report.selected_comments) ? report.selected_comments : [];
    const pdfData: TrialReportPdfData = {
      studentName,
      teacherName: trialInfo?.teacherName || 'N/A',
      program: trialInfo?.program || 'N/A',
      trialDate: trialInfo?.trialDate ? format(new Date(trialInfo.trialDate), 'dd MMM yyyy') : 'N/A',
      trialTime: formatTime12h(trialInfo?.trialTime),
      duration: `${trialInfo?.duration || 30} minutes`,
      age: trialInfo?.age ? String(trialInfo.age) : '',
      yearGroup: trialInfo?.yearGroup || '',
      readingStrengths: comments.filter((c: any) => c.skill === 'reading' && c.type === 'strength').map((c: any) => c.text),
      readingNextSteps: comments.filter((c: any) => c.skill === 'reading' && c.type === 'next_step').map((c: any) => c.text),
      speakingStrengths: comments.filter((c: any) => c.skill === 'speaking' && c.type === 'strength').map((c: any) => c.text),
      speakingNextSteps: comments.filter((c: any) => c.skill === 'speaking' && c.type === 'next_step').map((c: any) => c.text),
      teacherNotes: report.teacher_notes || '',
      finalText: report.final_text,
    };
    const doc = generateTrialReportPdf(pdfData);
    doc.save(`Trial_Report_${studentName.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded!');
  };

  const resetForm = () => {
    setStep('select');
    setSelectedIds(new Set());
    setTeacherNotes('');
    setGeneratedReport(null);
  };

  const CommentChips = ({ comments, maxSelect }: { comments: CommentBankEntry[]; maxSelect: number }) => {
    const selectedCount = comments.filter(c => selectedIds.has(c.comment_id)).length;
    return (
      <div className="flex flex-wrap gap-2">
        {comments.map(c => {
          const isSelected = selectedIds.has(c.comment_id);
          const isDisabled = !isSelected && selectedCount >= maxSelect;
          return (
            <button
              key={c.comment_id}
              onClick={() => !isDisabled && toggleComment(c.comment_id)}
              disabled={isDisabled}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all text-left ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isDisabled
                  ? 'opacity-40 cursor-not-allowed border-border bg-muted text-muted-foreground'
                  : 'border-border bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 inline mr-1" />}
              {c.comment_text}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Trial Lesson Report — {studentName}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select observations for reading and speaking, then generate a professional report.'}
            {step === 'preview' && 'Review, polish with AI, and download as PDF.'}
            {step === 'history' && 'Previous reports for this student.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Button variant={step === 'select' ? 'default' : 'ghost'} size="sm" onClick={() => setStep('select')}>
            1. Select Observations
          </Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Button variant={step === 'preview' ? 'default' : 'ghost'} size="sm" disabled={!generatedReport} onClick={() => setStep('preview')}>
            2. Preview & Download
          </Button>
          {existingReports.length > 0 && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Button variant={step === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setStep('history')}>
                History ({existingReports.length})
              </Button>
            </>
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1 pr-4">
          {step === 'select' && (
            <div className="space-y-5 pb-4">
              {bankLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Reading Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="w-4 h-4 text-blue-500" /> Reading
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          ✅ Strengths <span className="text-xs">(select 1–5)</span>
                        </p>
                        <CommentChips comments={filteredComments.readingStrengths} maxSelect={5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          🎯 Next Steps <span className="text-xs">(select 1–3)</span>
                        </p>
                        <CommentChips comments={filteredComments.readingNextSteps} maxSelect={3} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Speaking Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mic className="w-4 h-4 text-purple-500" /> Speaking & Listening
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          ✅ Strengths <span className="text-xs">(select 1–5)</span>
                        </p>
                        <CommentChips comments={filteredComments.speakingStrengths} maxSelect={5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          🎯 Next Steps <span className="text-xs">(select 1–3)</span>
                        </p>
                        <CommentChips comments={filteredComments.speakingNextSteps} maxSelect={3} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Teacher Notes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        📝 Teacher Notes <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Add any personal observation about the student that you'd like included in the report..."
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </CardContent>
                  </Card>

                  {/* Generate button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerate}
                      disabled={!canGenerate() || saveReport.isPending}
                      size="lg"
                    >
                      {saveReport.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-2" /> Generate Report</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'preview' && generatedReport && (
            <div className="space-y-4 pb-4">
              {/* Trial info summary */}
              {trialInfo && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-muted-foreground text-xs">Teacher</span>
                    <p className="font-medium">{trialInfo.teacherName || 'N/A'}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-muted-foreground text-xs">Date & Time</span>
                    <p className="font-medium">
                      {trialInfo.trialDate ? format(new Date(trialInfo.trialDate), 'dd MMM yyyy') : 'N/A'} · {formatTime12h(trialInfo.trialTime)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-muted-foreground text-xs">Program</span>
                    <p className="font-medium">{trialInfo.program || 'N/A'}</p>
                  </div>
                </div>
              )}

              <Card>
                <CardContent className="pt-6">
                  <Textarea
                    value={generatedReport.text}
                    onChange={(e) => setGeneratedReport({ ...generatedReport, text: e.target.value })}
                    className="min-h-[200px] text-sm leading-relaxed"
                  />
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 flex-wrap">
                {!generatedReport.isPolished && (
                  <Button onClick={handlePolish} disabled={polishReport.isPending} variant="outline">
                    {polishReport.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Polishing...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Polish with AI</>
                    )}
                  </Button>
                )}
                {generatedReport.isPolished && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                    <Sparkles className="w-3 h-3 mr-1" /> AI Polished
                  </Badge>
                )}
                <Button onClick={() => handleDownloadPdf()} className="bg-primary">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button onClick={handleCopy} variant="outline">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </Button>
                <Button variant="ghost" onClick={resetForm}>
                  Generate Another
                </Button>
              </div>
            </div>
          )}

          {step === 'history' && (
            <div className="space-y-3 pb-4">
              {existingReports.map(r => (
                <Card key={r.report_id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
                      </Badge>
                      {r.ai_polished_text && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" /> AI Polished
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed mb-3">{r.final_text}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadHistoryPdf(r)}
                      >
                        <Download className="w-3 h-3 mr-1" /> PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(r.final_text);
                          toast.success('Copied!');
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
