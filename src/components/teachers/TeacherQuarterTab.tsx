import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Users, BookOpen, TrendingUp } from 'lucide-react';
import { RateBadge } from '@/components/quarter/QuarterShared';
import {
  getAcademicYear, getAvailableAcademicYears, useQuarterAnalysis,
} from '@/hooks/use-quarter-analysis';

interface TeacherQuarterTabProps {
  teacherId: string;
}

export function TeacherQuarterTab({ teacherId }: TeacherQuarterTabProps) {
  const academicYears = getAvailableAcademicYears();
  const [selectedYear, setSelectedYear] = useState(academicYears[0].value);
  const [selectedQuarterIdx, setSelectedQuarterIdx] = useState(0);

  const academicYear = useMemo(() => getAcademicYear(selectedYear), [selectedYear]);
  const currentQuarter = academicYear.quarters[selectedQuarterIdx];

  const { data, isLoading } = useQuarterAnalysis(currentQuarter, selectedYear);

  const teacherData = useMemo(() => {
    if (!data || !teacherId) return null;
    return data.teachers.teacherDetails.find(t => t.teacherId === teacherId) || null;
  }, [data, teacherId]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(Number(v)); setSelectedQuarterIdx(0); }}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y.value} value={String(y.value)}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedQuarterIdx)} onValueChange={(v) => setSelectedQuarterIdx(Number(v))}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {academicYear.quarters.map((q, i) => (
              <SelectItem key={i} value={String(i)}>{q.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          {currentQuarter.months.map(m => new Date(2000, m - 1).toLocaleString('en', { month: 'short' })).join(' · ')}
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : teacherData ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-emerald-500/40">
              <CardContent className="p-4">
                <Clock className="w-4 h-4 text-emerald-500 mb-1" />
                <p className="text-2xl font-bold">{teacherData.totalHours.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">hrs</span></p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500/40">
              <CardContent className="p-4">
                <Users className="w-4 h-4 text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{teacherData.activeStudents}</p>
                <p className="text-xs text-muted-foreground">Active Students</p>
                <p className="text-[10px] text-muted-foreground/60">{teacherData.stoppedStudents} stopped · {teacherData.leftStudents} left</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500/40">
              <CardContent className="p-4">
                <TrendingUp className="w-4 h-4 text-amber-500 mb-1" />
                <p className="text-2xl font-bold"><RateBadge value={teacherData.retentionRate} good={80} /></p>
                <p className="text-xs text-muted-foreground mt-1">Retention Rate</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-violet-500/40">
              <CardContent className="p-4">
                <BookOpen className="w-4 h-4 text-violet-500 mb-1" />
                <p className="text-2xl font-bold">{teacherData.trialsConducted}</p>
                <p className="text-xs text-muted-foreground">Trials ({teacherData.trialConversions} converted)</p>
                <p className="text-[10px] text-muted-foreground/60">
                  {teacherData.trialsConducted > 0 ? `${teacherData.trialConversionRate}% conversion` : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                📅 Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-500/10">
                      <TableHead className="font-semibold">Month</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Stopped</TableHead>
                      <TableHead className="text-right">Left</TableHead>
                      <TableHead className="text-center">Retention %</TableHead>
                      <TableHead className="text-right">Trials</TableHead>
                      <TableHead className="text-right">Converted</TableHead>
                      <TableHead className="text-center">Conv. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherData.monthlyData.map((m, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{m.monthLabel}</TableCell>
                        <TableCell className="text-right">{m.hours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{m.activeStudents}</TableCell>
                        <TableCell className="text-right">{m.stoppedStudents}</TableCell>
                        <TableCell className="text-right">{m.leftStudents}</TableCell>
                        <TableCell className="text-center">
                          {(m.activeStudents + m.stoppedStudents + m.leftStudents) > 0
                            ? <RateBadge value={m.retentionRate} good={80} />
                            : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">{m.trialsConducted}</TableCell>
                        <TableCell className="text-right">{m.trialConversions}</TableCell>
                        <TableCell className="text-center">
                          {m.trialsConducted > 0
                            ? <RateBadge value={m.trialConversionRate} good={60} />
                            : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-blue-500/5">
                      <TableCell>Quarter Total</TableCell>
                      <TableCell className="text-right">{teacherData.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{teacherData.activeStudents}</TableCell>
                      <TableCell className="text-right">{teacherData.stoppedStudents}</TableCell>
                      <TableCell className="text-right">{teacherData.leftStudents}</TableCell>
                      <TableCell className="text-center"><RateBadge value={teacherData.retentionRate} good={80} /></TableCell>
                      <TableCell className="text-right">{teacherData.trialsConducted}</TableCell>
                      <TableCell className="text-right">{teacherData.trialConversions}</TableCell>
                      <TableCell className="text-center">
                        {teacherData.trialsConducted > 0
                          ? <RateBadge value={teacherData.trialConversionRate} good={60} />
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No performance data found for this quarter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
