import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfDay, subDays } from 'date-fns';

export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'none';

interface DatePresetFilterProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
}

export function getPresetDateRange(preset: DatePreset): { start: string | null; end: string | null } {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    case 'yesterday': {
      const y = subDays(today, 1);
      return { start: format(y, 'yyyy-MM-dd'), end: format(y, 'yyyy-MM-dd') };
    }
    case 'this_week': {
      const ws = startOfWeek(today, { weekStartsOn: 1 });
      const we = endOfWeek(today, { weekStartsOn: 1 });
      return { start: format(ws, 'yyyy-MM-dd'), end: format(we, 'yyyy-MM-dd') };
    }
    case 'last_7_days':
      return { start: format(subDays(today, 6), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    default:
      return { start: null, end: null };
  }
}

const presets: { key: DatePreset; label: string; icon?: typeof Clock }[] = [
  { key: 'today', label: 'Today', icon: Clock },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week', icon: Calendar },
  { key: 'last_7_days', label: 'Last 7 Days' },
];

export function DatePresetFilter({ value, onChange }: DatePresetFilterProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg overflow-hidden h-8">
      {presets.map(p => (
        <button
          key={p.key}
          onClick={() => onChange(value === p.key ? 'none' : p.key)}
          className={`px-2.5 h-full text-xs whitespace-nowrap transition-colors ${
            value === p.key
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          } ${p.key !== 'today' ? 'border-l' : ''}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
