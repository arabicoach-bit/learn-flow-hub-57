import { Search, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearMonthFilter, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

const trialStatusOptions = ['Trial Booked', 'Pending', 'Price Negotiation', 'Lost'];
const leadStatusOptions = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'];
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
  trialStatusFilter: string;
  onTrialStatusChange: (value: string) => void;
  leadStatusFilter: string;
  onLeadStatusChange: (value: string) => void;
  followUpFilter: string;
  onFollowUpChange: (value: string) => void;
  dateFilter: YearMonthFilterValue;
  onDateChange: (value: YearMonthFilterValue) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
}

export function LeadFiltersBar({
  search, onSearchChange,
  trialStatusFilter, onTrialStatusChange,
  leadStatusFilter, onLeadStatusChange,
  followUpFilter, onFollowUpChange,
  dateFilter, onDateChange,
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

        <Select value={leadStatusFilter} onValueChange={onLeadStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Lead Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lead Status</SelectItem>
            {leadStatusOptions.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={trialStatusFilter} onValueChange={onTrialStatusChange}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Trial Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trial Status</SelectItem>
            {trialStatusOptions.map(s => (
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

        <YearMonthFilter value={dateFilter} onChange={onDateChange} />

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
