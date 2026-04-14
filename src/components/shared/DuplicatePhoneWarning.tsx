import { AlertTriangle } from 'lucide-react';
import { useDuplicatePhoneCheck } from '@/hooks/use-duplicate-phone-check';
import { Badge } from '@/components/ui/badge';

interface DuplicatePhoneWarningProps {
  phone: string;
  excludeType?: 'lead' | 'trial' | 'student';
  excludeId?: string;
}

const typeLabels: Record<string, string> = {
  lead: 'Lead',
  trial: 'Trial',
  student: 'Student',
};

const typeColors: Record<string, string> = {
  lead: 'bg-amber-500/20 text-amber-400',
  trial: 'bg-blue-500/20 text-blue-400',
  student: 'bg-emerald-500/20 text-emerald-400',
};

export function DuplicatePhoneWarning({ phone, excludeType, excludeId }: DuplicatePhoneWarningProps) {
  const { data } = useDuplicatePhoneCheck(phone);

  if (!data?.found) return null;

  const filtered = data.matches.filter(m => !(excludeType === m.type && excludeId === m.id));
  if (filtered.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-medium text-amber-400">Duplicate phone number found</p>
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((m, i) => (
            <Badge key={i} variant="outline" className={`text-[10px] ${typeColors[m.type]}`}>
              {typeLabels[m.type]}: {m.name} ({m.status})
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
