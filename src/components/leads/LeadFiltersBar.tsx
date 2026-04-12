import { Search, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuarterFilter, type QuarterFilterValue } from '@/components/shared/QuarterFilter';

export type LeadSortOption = 'newest' | 'oldest' | 'alpha_asc' | 'alpha_desc' | 'last_contact' | 'next_followup';

const statusOptions = ['Pending', 'Trial Booked', 'Price Negotiation', 'Lost'];
const followUpOptions = [
  'F.1 – Student Motivation',
  'F.2 – Free Resources',
  'F.3 – Parent Feedback',
  'F.4 – Special Offer',
  'F.5 – Help Offer',
  'F.6 – Soft Reminder',
  'F.7 – Arabic Challenge',
];

interface LeadFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  followUpFilter: string;
  onFollowUpChange: (value: string) => void;
  quarterFilter: QuarterFilterValue;
  onQuarterChange: (value: QuarterFilterValue) => void;
  sortBy: LeadSortOption;
  onSortChange: (value: LeadSortOption) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
}

export function LeadFiltersBar({
  search, onSearchChange,
  statusFilter, onStatusChange,
  followUpFilter, onFollowUpChange,
  quarterFilter, onQuarterChange,
  sortBy, onSortChange,
  viewMode, onViewModeChange,
}: LeadFiltersBarProps) {
  return (
    <div className="space-y-3">
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

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Lead Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={followUpFilter} onValueChange={onFollowUpChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Follow-Up" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Follow-Up</SelectItem>
            {followUpOptions.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <QuarterFilter value={quarterFilter} onChange={onQuarterChange} />

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as LeadSortOption)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="alpha_asc">A → Z (Name)</SelectItem>
            <SelectItem value="alpha_desc">Z → A (Name)</SelectItem>
            <SelectItem value="last_contact">Last Contact</SelectItem>
            <SelectItem value="next_followup">Next Follow-Up</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-none h-10"
            onClick={() => onViewModeChange('cards')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-none h-10"
            onClick={() => onViewModeChange('table')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
