import { Search, LayoutGrid, TableIcon, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { QuarterFilter, type QuarterFilterValue } from '@/components/shared/QuarterFilter';

interface Teacher {
  teacher_id: string;
  name: string;
}

interface StudentFiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  teacherFilter: string;
  onTeacherFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (v: string) => void;
  dateFilter: QuarterFilterValue;
  onDateFilterChange: (v: QuarterFilterValue) => void;
  teachers: Teacher[] | undefined;
  viewMode: 'table' | 'cards';
  onViewModeChange: (v: 'table' | 'cards') => void;
  sortField: string;
  onSortFieldChange: (v: string) => void;
}

export function StudentFiltersBar({
  search, onSearchChange,
  teacherFilter, onTeacherFilterChange,
  statusFilter, onStatusFilterChange,
  paymentFilter, onPaymentFilterChange,
  dateFilter, onDateFilterChange,
  teachers,
  viewMode, onViewModeChange,
  sortField, onSortFieldChange,
}: StudentFiltersBarProps) {
  return (
    <div className="flex gap-3 flex-wrap items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search students..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-10" />
      </div>
      <Select value={teacherFilter || 'all'} onValueChange={(v) => onTeacherFilterChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-48"><SelectValue placeholder="All Teachers" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>
          {teachers?.map((t) => (
            <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter || 'all'} onValueChange={(v) => onStatusFilterChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Temporary Stop">Stop</SelectItem>
          <SelectItem value="Left">Left</SelectItem>
        </SelectContent>
      </Select>
      <Select value={paymentFilter || 'all'} onValueChange={(v) => onPaymentFilterChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Payment" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payments</SelectItem>
          <SelectItem value="Paid">Paid</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Renewal">Renewal</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortField} onValueChange={onSortFieldChange}>
        <SelectTrigger className="w-40">
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name A–Z</SelectItem>
          <SelectItem value="name-desc">Name Z–A</SelectItem>
          <SelectItem value="wallet-asc">Wallet ↑</SelectItem>
          <SelectItem value="wallet-desc">Wallet ↓</SelectItem>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
        </SelectContent>
      </Select>
      <QuarterFilter value={dateFilter} onChange={onDateFilterChange} />
      <div className="flex border rounded-md overflow-hidden">
        <Button
          variant={viewMode === 'table' ? 'default' : 'ghost'}
          size="icon"
          className="h-9 w-9 rounded-none"
          onClick={() => onViewModeChange('table')}
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'cards' ? 'default' : 'ghost'}
          size="icon"
          className="h-9 w-9 rounded-none"
          onClick={() => onViewModeChange('cards')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
