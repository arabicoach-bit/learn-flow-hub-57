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
import { EditStudentDialog } from '@/components/teacher/EditStudentDialog';
import { StudentLessonsView } from '@/components/student/StudentLessonsView';
import { GraduationCap, Search, Phone, ChevronDown, User, School, BookOpen, Calendar, Pencil, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function TeacherStudents() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: programs } = usePrograms();
  
  const myStudents = students?.filter(s => s.teacher_id === teacherId) || [];

  const filteredStudents = myStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.phone.includes(search);
    const matchesStatus = !statusFilter || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            </div>
          </CardContent>
        </Card>

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
                                  Profile
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {student.age && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Age:</span>
                                      <span className="font-medium">{student.age} years</span>
                                    </div>
                                  )}
                                  {student.gender && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Gender:</span>
                                      <span className="font-medium">{student.gender}</span>
                                    </div>
                                  )}
                                  {student.school && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <School className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">School:</span>
                                      <span className="font-medium">{student.school}</span>
                                    </div>
                                  )}
                                  {student.year_group && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Year Group:</span>
                                      <span className="font-medium">{student.year_group}</span>
                                    </div>
                                  )}
                                  {programName && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Program:</span>
                                      <span className="font-medium">{programName}</span>
                                    </div>
                                  )}
                                  {student.student_level && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Level:</span>
                                      <span className="font-medium">{student.student_level}</span>
                                    </div>
                                  )}
                                  {student.nationality && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Nationality:</span>
                                      <span className="font-medium">{student.nationality}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-4 flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingStudent(student);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit Profile
                                  </Button>
                                </div>
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
