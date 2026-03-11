import { Search, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearMonthFilter, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import type { Database } from '@/integrations/supabase/types';

export type TrialSortOption = 'newest' | 'oldest' | 'alpha_asc' | 'alpha_desc' | 'trial_date' | 'last_contact';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];
type TrialConversionStatus = 'Pending' | 'Converted' | 'Lost';

interface Teacher {
  teacher_id: string;
  name: string;
  is_active: boolean | null;
}

interface TrialFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TrialStatus | 'all';
  onStatusChange: (value: TrialStatus | 'all') => void;
  conversionFilter: TrialConversionStatus | 'all';
  onConversionChange: (value: TrialConversionStatus | 'all') => void;
  resultFilter: TrialResult | 'all';
  onResultChange: (value: TrialResult | 'all') => void;
  teacherFilter: string;
  onTeacherChange: (value: string) => void;
  dateFilter: YearMonthFilterValue;
  onDateChange: (value: YearMonthFilterValue) => void;
  sortBy: TrialSortOption;
  onSortChange: (value: TrialSortOption) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  teachers?: Teacher[];
}

export function TrialFiltersBar({
  search, onSearchChange,
  statusFilter, onStatusChange,
  conversionFilter, onConversionChange,
  resultFilter, onResultChange,
  teacherFilter, onTeacherChange,
  dateFilter, onDateChange,
  sortBy, onSortChange,
  viewMode, onViewModeChange,
  teachers,
}: TrialFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as TrialStatus | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Attendance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Attendance</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Absent">Absent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={conversionFilter} onValueChange={(v) => onConversionChange(v as TrialConversionStatus | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Conversion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conversion</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Converted">Converted</SelectItem>
            <SelectItem value="Lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={(v) => onResultChange(v as TrialResult | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="Very Positive">Very Positive</SelectItem>
            <SelectItem value="Positive">Positive</SelectItem>
            <SelectItem value="Neutral">Neutral</SelectItem>
            <SelectItem value="Negative">Negative</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={onTeacherChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teachers</SelectItem>
            {teachers?.filter(t => t.is_active).map(t => (
              <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <YearMonthFilter value={dateFilter} onChange={onDateChange} />
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as TrialSortOption)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="alpha_asc">A → Z (Name)</SelectItem>
            <SelectItem value="alpha_desc">Z → A (Name)</SelectItem>
            <SelectItem value="trial_date">Trial Date</SelectItem>
            <SelectItem value="last_contact">Last Contact</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="icon" className="rounded-none h-10" onClick={() => onViewModeChange('cards')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className="rounded-none h-10" onClick={() => onViewModeChange('table')}>
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
