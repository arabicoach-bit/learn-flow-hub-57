import { useState } from 'react';
import { useTeachers } from '@/hooks/use-teachers';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileText, Download, Loader2, Calculator, Save } from 'lucide-react';
import { formatSalary } from '@/lib/wallet-utils';

interface PayrollData {
  teacher_id: string;
  teacher_name: string;
  lessons_taken: number;
  rate_per_lesson: number;
  amount_due: number;
}

export function TeacherPayrollReport() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: teachers } = useTeachers();

  const generatePayroll = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch lessons taken in the period for each teacher
      const { data: lessons, error } = await supabase
        .from('lessons_log')
        .select('teacher_id, status')
        .gte('lesson_date', startDate)
        .lte('lesson_date', endDate)
        .eq('status', 'Taken');

      if (error) throw error;

      // Count lessons per teacher
      const lessonCounts: Record<string, number> = {};
      lessons?.forEach(lesson => {
        if (lesson.teacher_id) {
          lessonCounts[lesson.teacher_id] = (lessonCounts[lesson.teacher_id] || 0) + 1;
        }
      });

      // Build payroll data
      const payroll: PayrollData[] = (teachers || []).map(teacher => ({
        teacher_id: teacher.teacher_id,
        teacher_name: teacher.name,
        lessons_taken: lessonCounts[teacher.teacher_id] || 0,
        rate_per_lesson: teacher.rate_per_lesson,
        amount_due: (lessonCounts[teacher.teacher_id] || 0) * teacher.rate_per_lesson,
      })).filter(p => p.lessons_taken > 0);

      setPayrollData(payroll);
      
      if (payroll.length === 0) {
        toast.info('No lessons found in the selected period');
      } else {
        toast.success(`Generated payroll for ${payroll.length} teacher(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate payroll');
    } finally {
      setIsLoading(false);
    }
  };

  const savePayroll = async () => {
    if (payrollData.length === 0) {
      toast.error('No payroll data to save');
      return;
    }

    setIsSaving(true);
    try {
      const payrollRecords = payrollData.map(p => ({
        teacher_id: p.teacher_id,
        period_start: startDate,
        period_end: endDate,
        lessons_taken: p.lessons_taken,
        rate_per_lesson: p.rate_per_lesson,
        amount_due: p.amount_due,
        status: 'Draft' as const,
      }));

      const { error } = await supabase
        .from('teachers_payroll')
        .insert(payrollRecords);

      if (error) throw error;

      toast.success('Payroll saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payroll');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    if (payrollData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Teacher Name', 'Lessons Taken', 'Rate per Lesson', 'Amount Due'];
    const rows = payrollData.map(p => [
      p.teacher_name,
      p.lessons_taken.toString(),
      p.rate_per_lesson.toString(),
      p.amount_due.toString(),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  const totalAmount = payrollData.reduce((sum, p) => sum + p.amount_due, 0);
  const totalLessons = payrollData.reduce((sum, p) => sum + p.lessons_taken, 0);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Teacher Payroll Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={generatePayroll} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : payrollData.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a date range and generate the report</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
                <p className="text-2xl font-bold">{totalLessons}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount Due</p>
                <p className="text-2xl font-bold text-primary">{formatSalary(totalAmount)}</p>
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Lessons</TableHead>
                  <TableHead className="text-right">Rate/Lesson</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.map((row) => (
                  <TableRow key={row.teacher_id}>
                    <TableCell className="font-medium">{row.teacher_name}</TableCell>
                    <TableCell className="text-right">{row.lessons_taken}</TableCell>
                    <TableCell className="text-right">{formatSalary(row.rate_per_lesson)}</TableCell>
                    <TableCell className="text-right font-medium">{formatSalary(row.amount_due)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted">Draft</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={savePayroll} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Payroll
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
