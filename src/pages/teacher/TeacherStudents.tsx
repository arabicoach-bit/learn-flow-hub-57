import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudents, Student } from '@/hooks/use-students';
import { usePrograms } from '@/hooks/use-programs';
import { getWalletColor, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { StudentLessonsView } from '@/components/student/StudentLessonsView';
import { StudentInfoView } from '@/components/student/StudentInfoView';
import { GraduationCap, Search, Phone, ChevronDown, User, School, BookOpen, Calendar, Pencil, AlertTriangle, Users, UserCheck, PauseCircle, UserX, TrendingUp, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { YearMonthFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';

export default function TeacherStudents() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
  const [studentFilter, setStudentFilter] = useState<YearMonthFilterValue>({ year: null, month: null });

  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: programs } = usePrograms();
  
  const myStudents = students?.filter(s => s.teacher_id === teacherId) || [];

  const studentRange = getFilterDateRange(studentFilter);

  const filteredStudents = useMemo(() => {
    return myStudents.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.phone.includes(search);
      const matchesStatus = !statusFilter || student.status === statusFilter;
      const createdAt = student.created_at ? new Date(student.created_at) : null;
      const matchesDate = !createdAt || (
        (!studentRange.startDate || createdAt >= new Date(studentRange.startDate)) &&
        (!studentRange.endDate || createdAt <= new Date(studentRange.endDate + 'T23:59:59'))
      );
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [myStudents, search, statusFilter, studentRange]);

  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(s => s.status === 'Active').length;
  const tempStopStudents = filteredStudents.filter(s => s.status === 'Temporary Stop').length;
  const leftStudents = filteredStudents.filter(s => s.status === 'Left').length;
  const retentionRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) newSet.delete(studentId);
      else newSet.add(studentId);
      return newSet;
    });
  };

  const getProgramName = (programId: string | null) => {
    if (!programId) return null;
    return programs?.find(p => p.program_id === programId)?.name;
  };

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Students</h1>
          <p className="text-muted-foreground">Complete student profiles with lesson history, statistics, and management</p>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search students..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="pl-10" 
                />
              </div>
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Temporary Stop">Temporary Stop</SelectItem>
                  <SelectItem value="Left">Left</SelectItem>
                </SelectContent>
              </Select>
              <YearMonthFilter value={studentFilter} onChange={setStudentFilter} />
            </div>
          </CardContent>
        </Card>

        {/* Student Statistics */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
            Student Statistics
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xl font-bold">{totalStudents}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-xl font-bold">{activeStudents}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <PauseCircle className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xl font-bold">{tempStopStudents}</p>
                      <p className="text-xs text-muted-foreground">Temp Stop</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-destructive" />
                    <div>
                      <p className="text-xl font-bold">{leftStudents}</p>
                      <p className="text-xs text-muted-foreground">Left</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-xl font-bold">{retentionRate}%</p>
                      <p className="text-xs text-muted-foreground">Retention</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Students List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              Students ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="space-y-3">
                {filteredStudents.map((student) => {
                  const isExpanded = expandedStudents.has(student.student_id);
                  const programName = getProgramName(student.program_id);
                  const lowCredit = (student.wallet_balance || 0) <= 2;
                  
                  return (
                    <Collapsible
                      key={student.student_id}
                      open={isExpanded}
                      onOpenChange={() => toggleStudent(student.student_id)}
                    >
                      <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-muted/30 transition-colors cursor-pointer">
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{student.name}</p>
                                <Badge
                                  variant="outline"
                                  className={
                                    student.status === 'Active'
                                      ? 'status-active'
                                      : student.status === 'Temporary Stop'
                                      ? 'status-grace'
                                      : 'status-blocked'
                                  }
                                >
                                  {getStatusDisplayLabel(student.status)}
                                </Badge>
                                {lowCredit && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Low Credit
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {student.phone}
                                </span>
                                {programName && (
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    {programName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`font-medium ${getWalletColor(student.wallet_balance || 0)}`}>
                                Wallet: {student.wallet_balance} lessons
                              </span>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="border-t border-border/50 bg-muted/10">
                            <Tabs defaultValue="lessons" className="w-full">
                              <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-4 pt-2">
                                <TabsTrigger value="lessons" className="data-[state=active]:bg-muted">
                                  <BookOpen className="w-4 h-4 mr-1" />
                                  Lessons
                                </TabsTrigger>
                                <TabsTrigger value="profile" className="data-[state=active]:bg-muted">
                                  <User className="w-4 h-4 mr-1" />
                                  Student Information
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="lessons" className="p-4 mt-0">
                                <StudentLessonsView
                                  studentId={student.student_id}
                                  studentName={student.name}
                                  walletBalance={student.wallet_balance || 0}
                                  role="teacher"
                                  teacherId={teacherId}
                                />
                              </TabsContent>

                              <TabsContent value="profile" className="p-4 mt-0">
                                <StudentInfoView student={student} role="teacher" />
                              </TabsContent>
                            </Tabs>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No students found</p>
            )}
          </CardContent>
        </Card>

        <EditStudentDialog
          student={editingStudent}
          open={!!editingStudent}
          onOpenChange={(open) => !open && setEditingStudent(null)}
        />
      </div>
    </TeacherLayout>
  );
}
