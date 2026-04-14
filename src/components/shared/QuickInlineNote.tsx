import { useState } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface QuickInlineNoteProps {
  onSubmit: (note: string) => Promise<void>;
  placeholder?: string;
}

export function QuickInlineNote({ onSubmit, placeholder = 'Quick note...' }: QuickInlineNoteProps) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = note.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-xs bg-background/50"
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
        maxLength={500}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleSubmit}
        disabled={!note.trim() || submitting}
      >
        <Send className="h-3 w-3" />
      </Button>
    </div>
  );
}
