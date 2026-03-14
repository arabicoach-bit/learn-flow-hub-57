import { Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearMonthFilter, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

export type PackageSortOption = 'newest' | 'oldest' | 'alpha_asc' | 'alpha_desc' | 'due_date' | 'payment_date' | 'amount_high' | 'amount_low';

interface Teacher {
  teacher_id: string;
  name: string;
}

interface PackageFiltersBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filter: YearMonthFilterValue;
  onFilterChange: (v: YearMonthFilterValue) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  teacherFilter: string;
  onTeacherFilterChange: (v: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (v: string) => void;
  teachers: Teacher[] | undefined;
  sortBy: PackageSortOption;
  onSortChange: (v: PackageSortOption) => void;
}

export function PackageFiltersBar({
  searchQuery, onSearchChange,
  filter, onFilterChange,
  statusFilter, onStatusFilterChange,
  teacherFilter, onTeacherFilterChange,
  paymentFilter, onPaymentFilterChange,
  teachers,
  sortBy, onSortChange,
}: PackageFiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student or package type..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <YearMonthFilter value={filter} onChange={onFilterChange} />
      <Select value={sortBy} onValueChange={(v) => onSortChange(v as PackageSortOption)}>
        <SelectTrigger className="w-[160px]">
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="alpha_asc">A → Z (Student)</SelectItem>
          <SelectItem value="alpha_desc">Z → A (Student)</SelectItem>
          <SelectItem value="due_date">Due Date</SelectItem>
          <SelectItem value="payment_date">Payment Date</SelectItem>
          <SelectItem value="amount_high">Amount (High)</SelectItem>
          <SelectItem value="amount_low">Amount (Low)</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Active">In Progress</SelectItem>
          <SelectItem value="Completed">Finished</SelectItem>
        </SelectContent>
      </Select>
      <Select value={teacherFilter} onValueChange={onTeacherFilterChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Teacher" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>
          {teachers?.map(t => (
            <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Payment" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payments</SelectItem>
          <SelectItem value="Paid">Paid</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
