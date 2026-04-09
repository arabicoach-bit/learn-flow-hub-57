import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuditLogs, useAdminUsers } from '@/hooks/use-audit-log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Filter, Search, User, Clock } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  student_created: { label: 'Student Created', color: 'bg-green-100 text-green-800' },
  student_updated: { label: 'Student Updated', color: 'bg-blue-100 text-blue-800' },
  student_deleted: { label: 'Student Deleted', color: 'bg-red-100 text-red-800' },
  student_status_changed: { label: 'Status Changed', color: 'bg-yellow-100 text-yellow-800' },
  student_transfer: { label: 'Student Transfer', color: 'bg-purple-100 text-purple-800' },
  package_created: { label: 'Package Created', color: 'bg-green-100 text-green-800' },
  package_updated: { label: 'Package Updated', color: 'bg-blue-100 text-blue-800' },
  package_deleted: { label: 'Package Deleted', color: 'bg-red-100 text-red-800' },
  package_approved: { label: 'Package Approved', color: 'bg-green-100 text-green-800' },
  free_lessons_added: { label: 'Free Lessons Added', color: 'bg-teal-100 text-teal-800' },
  lesson_status_changed: { label: 'Lesson Status', color: 'bg-blue-100 text-blue-800' },
  lesson_deleted: { label: 'Lesson Deleted', color: 'bg-red-100 text-red-800' },
  lesson_added: { label: 'Lesson Added', color: 'bg-green-100 text-green-800' },
  schedule_generated: { label: 'Schedule Generated', color: 'bg-indigo-100 text-indigo-800' },
  teacher_created: { label: 'Teacher Created', color: 'bg-green-100 text-green-800' },
  teacher_updated: { label: 'Teacher Updated', color: 'bg-blue-100 text-blue-800' },
  teacher_deleted: { label: 'Teacher Deleted', color: 'bg-red-100 text-red-800' },
  teacher_activated: { label: 'Teacher Activated', color: 'bg-green-100 text-green-800' },
  teacher_deactivated: { label: 'Teacher Deactivated', color: 'bg-orange-100 text-orange-800' },
  password_reset: { label: 'Password Reset', color: 'bg-yellow-100 text-yellow-800' },
  lead_created: { label: 'Lead Created', color: 'bg-green-100 text-green-800' },
  lead_updated: { label: 'Lead Updated', color: 'bg-blue-100 text-blue-800' },
  lead_deleted: { label: 'Lead Deleted', color: 'bg-red-100 text-red-800' },
  trial_created: { label: 'Trial Created', color: 'bg-green-100 text-green-800' },
  trial_updated: { label: 'Trial Updated', color: 'bg-blue-100 text-blue-800' },
  trial_deleted: { label: 'Trial Deleted', color: 'bg-red-100 text-red-800' },
  trial_converted: { label: 'Trial Converted', color: 'bg-purple-100 text-purple-800' },
  notification_read: { label: 'Notification Read', color: 'bg-gray-100 text-gray-800' },
  admin_created: { label: 'Admin Created', color: 'bg-green-100 text-green-800' },
  admin_deleted: { label: 'Admin Deleted', color: 'bg-red-100 text-red-800' },
  admin_password_reset: { label: 'Admin PW Reset', color: 'bg-yellow-100 text-yellow-800' },
  payroll_approved: { label: 'Payroll Approved', color: 'bg-green-100 text-green-800' },
  payroll_paid: { label: 'Payroll Paid', color: 'bg-green-100 text-green-800' },
  password_reset_by_admin: { label: 'Password Reset', color: 'bg-yellow-100 text-yellow-800' },
};

const ENTITY_TYPES = [
  { value: 'student', label: 'Students' },
  { value: 'package', label: 'Packages' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'lead', label: 'Leads' },
  { value: 'trial', label: 'Trial Students' },
  { value: 'lesson', label: 'Lessons' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'admin', label: 'Admin' },
  { value: 'notification', label: 'Notifications' },
];

function getActionInfo(action: string) {
  return ACTION_LABELS[action] || { label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), color: 'bg-muted text-muted-foreground' };
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return '-';
  const entries = Object.entries(details)
    .filter(([k]) => !['performed_at'].includes(k))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .slice(0, 4);
  return entries.join(' | ') || '-';
}

export default function ActivityLog() {
  const [adminFilter, setAdminFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  const { data: logs = [], isLoading } = useAuditLogs({
    admin_id: adminFilter || undefined,
    entity_type: entityFilter || undefined,
    action: searchFilter || undefined,
    date_start: dateStart || undefined,
    date_end: dateEnd || undefined,
    limit: 500,
  });

  const { data: admins = [] } = useAdminUsers();

  // Stats
  const todayLogs = logs.filter(l => {
    const today = new Date().toISOString().slice(0, 10);
    return l.created_at?.startsWith(today);
  });

  const adminActivityCounts = admins.map(admin => ({
    ...admin,
    count: logs.filter(l => l.performed_by === admin.id).length,
    todayCount: todayLogs.filter(l => l.performed_by === admin.id).length,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all admin activities across the system
          </p>
        </div>

        {/* Admin summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {adminActivityCounts.map(admin => (
            <Card
              key={admin.id}
              className={`cursor-pointer transition-all ${adminFilter === admin.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
              onClick={() => setAdminFilter(adminFilter === admin.id ? '' : admin.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{admin.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className="text-muted-foreground">Today: <strong className="text-foreground">{admin.todayCount}</strong></span>
                  <span className="text-muted-foreground">Total: <strong className="text-foreground">{admin.count}</strong></span>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="flex items-center justify-center">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{todayLogs.length}</p>
              <p className="text-xs text-muted-foreground">Actions Today</p>
              <p className="text-lg font-semibold mt-1">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Shown</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={adminFilter} onValueChange={v => setAdminFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Admins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {admins.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={v => setEntityFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ENTITY_TYPES.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Input
                type="date"
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
                placeholder="From"
              />
              <Input
                type="date"
                value={dateEnd}
                onChange={e => setDateEnd(e.target.value)}
                placeholder="To"
              />
            </div>
          </CardContent>
        </Card>

        {/* Activity table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Time</TableHead>
                    <TableHead className="w-[140px]">Admin</TableHead>
                    <TableHead className="w-[160px]">Action</TableHead>
                    <TableHead className="w-[100px]">Category</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activity logs found</TableCell>
                    </TableRow>
                  ) : (
                    logs.map(log => {
                      const actionInfo = getActionInfo(log.action);
                      return (
                        <TableRow key={log.log_id}>
                          <TableCell className="text-xs">
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{new Date(log.created_at).toLocaleString()}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {log.admin_name || 'System'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-xs ${actionInfo.color}`}>
                              {actionInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground capitalize">
                            {log.entity_type || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                            {formatDetails(log.details as Record<string, unknown> | null)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
