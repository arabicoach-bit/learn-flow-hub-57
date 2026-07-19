import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAcademicYear, getAvailableAcademicYears } from '@/hooks/use-quarter-analysis';

export interface QuarterFilterValue {
  year: number;
  quarterIdx: number;
}

/** Returns the current academic year start and quarter index */
export function getCurrentQuarter(): QuarterFilterValue {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();

  // Academic year starts in September
  const academicYear = month >= 9 ? year : year - 1;

  // Q1: Sep-Nov, Q2: Dec-Mar, Q3: Apr-Jun, Q4: Jul-Aug
  let quarterIdx = 0;
  if (month >= 9 && month <= 11) quarterIdx = 0;
  else if (month === 12 || (month >= 1 && month <= 3)) quarterIdx = 1;
  else if (month >= 4 && month <= 6) quarterIdx = 2;
  else quarterIdx = 3; // Jul-Aug

  return { year: academicYear, quarterIdx };
}

/** Get start/end dates for a quarter filter value */
export function getQuarterDateRange(value: QuarterFilterValue): { startDate: string; endDate: string } {
  const academicYear = getAcademicYear(value.year);
  const quarter = academicYear.quarters[value.quarterIdx];
  return { startDate: quarter.startDate, endDate: quarter.endDate };
}

interface QuarterFilterProps {
  value: QuarterFilterValue;
  onChange: (value: QuarterFilterValue) => void;
  className?: string;
}

export function QuarterFilter({ value, onChange, className }: QuarterFilterProps) {
  const academicYears = getAvailableAcademicYears();
  const academicYear = getAcademicYear(value.year);

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Select
        value={String(value.year)}
        onValueChange={(v) => onChange({ year: Number(v), quarterIdx: 0 })}
      >
        <SelectTrigger className="w-[140px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {academicYears.map((y) => (
            <SelectItem key={y.value} value={String(y.value)}>{y.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(value.quarterIdx)}
        onValueChange={(v) => onChange({ ...value, quarterIdx: Number(v) })}
      >
        <SelectTrigger className="w-[130px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {academicYear.quarters.map((q, i) => (
            <SelectItem key={i} value={String(i)}>{q.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
