import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function generateYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 2; y <= current + 2; y++) years.push(y);
  return years;
}

export interface YearMonthFilterValue {
  year: number | null;
  month: number | null; // 0-11, null = all months
}

interface YearMonthFilterProps {
  value: YearMonthFilterValue;
  onChange: (value: YearMonthFilterValue) => void;
}

export function getFilterDateRange(filter: YearMonthFilterValue): { startDate: string | null; endDate: string | null } {
  if (filter.year === null) {
    return { startDate: null, endDate: null }; // All time
  }
  if (filter.month === null) {
    // Full year
    return {
      startDate: `${filter.year}-01-01`,
      endDate: `${filter.year}-12-31`,
    };
  }
  // Specific month
  const start = new Date(filter.year, filter.month, 1);
  const end = new Date(filter.year, filter.month + 1, 0); // last day of month
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    startDate: `${filter.year}-${pad(filter.month + 1)}-01`,
    endDate: `${filter.year}-${pad(filter.month + 1)}-${pad(end.getDate())}`,
  };
}

export function getDefaultFilter(): YearMonthFilterValue {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function getFilterLabel(filter: YearMonthFilterValue): string {
  if (filter.year === null) return 'All Time';
  if (filter.month === null) return `${filter.year}`;
  return `${MONTHS[filter.month]} ${filter.year}`;
}

export function YearMonthFilter({ value, onChange }: YearMonthFilterProps) {
  const years = generateYears();
  const isAllTime = value.year === null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select
        value={isAllTime ? 'all' : value.year!.toString()}
        onValueChange={(v) => {
          if (v === 'all') {
            onChange({ year: null, month: null });
          } else {
            onChange({ ...value, year: parseInt(v) });
          }
        }}
      >
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={isAllTime ? 'all' : (value.month === null ? 'all' : value.month.toString())}
        onValueChange={(v) => {
          if (v === 'all') {
            onChange({ ...value, month: null });
          } else {
            // If currently "All Time", set year to current year when picking a month
            const year = value.year ?? new Date().getFullYear();
            onChange({ year, month: parseInt(v) });
          }
        }}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={isAllTime ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 text-xs"
        onClick={() => onChange({ year: null, month: null })}
      >
        All Time
      </Button>
    </div>
  );
}
