import { Search, Filter, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeacherFiltersBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (v: 'all' | 'active' | 'inactive') => void;
  viewMode: 'table' | 'card';
  onViewModeChange: (v: 'table' | 'card') => void;
  teacherCount: number;
}

export function TeacherFiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  teacherCount,
}: TeacherFiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as any)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({teacherCount})</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <TooltipProvider>
          <div className="flex items-center border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => onViewModeChange('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Table view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => onViewModeChange('card')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Card view</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
