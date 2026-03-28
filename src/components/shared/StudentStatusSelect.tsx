import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusDisplayLabel } from '@/lib/wallet-utils';

interface StudentStatusSelectProps {
  value: string | null;
  onValueChange: (value: 'Active' | 'Temporary Stop' | 'Left') => void;
}

const statusConfig = [
  { value: 'Active', label: 'Active', dotClass: 'bg-emerald-500', bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  { value: 'Temporary Stop', label: 'Stop', dotClass: 'bg-amber-500', bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  { value: 'Left', label: 'Left', dotClass: 'bg-red-500', bgClass: 'bg-red-500/10 text-red-700 dark:text-red-400' },
] as const;

function getDotClass(status: string | null) {
  return statusConfig.find(s => s.value === status)?.dotClass ?? 'bg-muted-foreground';
}

function getBgClass(status: string | null) {
  return statusConfig.find(s => s.value === status)?.bgClass ?? '';
}

export function StudentStatusSelect({ value, onValueChange }: StudentStatusSelectProps) {
  return (
    <Select value={value || 'Active'} onValueChange={onValueChange}>
      <SelectTrigger className={`w-[100px] h-7 text-xs font-medium border-0 rounded-full px-2.5 focus:ring-0 focus:ring-offset-0 gap-1.5 ${getBgClass(value)}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${getDotClass(value)}`} />
        <span className="truncate">{getStatusDisplayLabel(value || 'Active')}</span>
      </SelectTrigger>
      <SelectContent className="min-w-[140px]">
        {statusConfig.map(({ value: v, label, dotClass }) => (
          <SelectItem key={v} value={v} className="text-xs">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
              {label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
