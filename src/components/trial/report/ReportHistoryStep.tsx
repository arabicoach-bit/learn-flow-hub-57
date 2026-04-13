import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Copy, Download, Check } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { TrialReport } from '@/hooks/use-trial-reports';

interface ReportHistoryStepProps {
  reports: TrialReport[];
  onDownloadPdf: (report: TrialReport) => void;
}

export function ReportHistoryStep({ reports, onDownloadPdf }: ReportHistoryStepProps) {
  if (reports.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No reports generated yet.</p>;
  }

  return (
    <div className="space-y-3">
      {reports.map(r => (
        <Card key={r.report_id}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
              </Badge>
              {r.ai_polished_text && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" /> AI Polished
                </Badge>
              )}
              {(r as any).status === 'sent' && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                  <Check className="w-3 h-3 mr-1" /> Sent
                </Badge>
              )}
              {(r as any).recommended_level && (
                <Badge variant="outline" className="text-xs">
                  Level: {(r as any).recommended_level}
                </Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed mb-3 line-clamp-4">{r.final_text}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onDownloadPdf(r)}>
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
  );
}
