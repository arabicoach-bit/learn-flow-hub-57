import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, FileSpreadsheet, Search, Calendar, Filter } from 'lucide-react';
import { usePackages } from '@/hooks/use-packages';
import { useTeachers } from '@/hooks/use-teachers';
import { formatCurrency } from '@/lib/wallet-utils';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { exportPackages } from '@/lib/excel-export';

type PeriodFilter = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'Active' | 'Completed';

export default function Packages() {
  const navigate = useNavigate();
  const { data: packages, isLoading } = usePackages();
  const { data: teachers } = useTeachers();
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');

  const getDateRange = (period: PeriodFilter) => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return null;
    }
  };

  const filteredPackages = packages?.filter(pkg => {
    // Search filter
    const studentName = pkg.students?.name?.toLowerCase() || '';
    const packageType = pkg.package_types?.name?.toLowerCase() || '';
    const matchesSearch = searchQuery === '' || 
      studentName.includes(searchQuery.toLowerCase()) ||
      packageType.includes(searchQuery.toLowerCase());

    // Period filter
    let matchesPeriod = true;
    if (periodFilter !== 'all') {
      const range = getDateRange(periodFilter);
      if (range && pkg.created_at) {
        matchesPeriod = isWithinInterval(parseISO(pkg.created_at), range);
      }
    }

    // Status filter
    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;

    return matchesSearch && matchesPeriod && matchesStatus;
  }) || [];

  const totalRevenue = filteredPackages.reduce((sum, pkg) => sum + (pkg.amount || 0), 0);
  const totalLessons = filteredPackages.reduce((sum, pkg) => sum + (pkg.lessons_purchased || 0), 0);
  const activePackages = filteredPackages.filter(pkg => pkg.status === 'Active').length;
  const renewals = filteredPackages.filter(pkg => pkg.is_renewal).length;

  const handleExport = () => {
    if (filteredPackages.length > 0) {
      exportPackages(filteredPackages);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Packages
            </h1>
            <p className="text-muted-foreground">Track all student packages and renewals</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{filteredPackages.length}</div>
              <p className="text-sm text-muted-foreground">Total Packages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{activePackages}</div>
              <p className="text-sm text-muted-foreground">Active Packages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{renewals}</div>
              <p className="text-sm text-muted-foreground">Renewals</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student or package type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Packages Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading packages...</div>
            ) : filteredPackages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No packages found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Package Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead className="text-center">Lessons</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackages.map((pkg) => (
                      <TableRow 
                        key={pkg.package_id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/students/${pkg.student_id}`)}
                      >
                        <TableCell className="font-medium">
                          {pkg.students?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {pkg.package_types?.name || 'Custom'}
                        </TableCell>
                        <TableCell>
                          {pkg.start_date ? format(new Date(pkg.start_date), 'MMM d, yyyy') : 
                           pkg.created_at ? format(new Date(pkg.created_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-muted-foreground">{pkg.lessons_used || 0}</span>
                          <span className="text-muted-foreground">/</span>
                          <span>{pkg.lessons_purchased}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(pkg.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={pkg.status === 'Active' ? 'default' : 'secondary'}
                            className={pkg.status === 'Active' ? 'bg-green-600' : ''}
                          >
                            {pkg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {pkg.is_renewal ? (
                            <Badge variant="outline" className="border-blue-500 text-blue-600">
                              Renewal
                            </Badge>
                          ) : (
                            <Badge variant="outline">New</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
