import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudents } from '@/hooks/use-students';
import { useClasses } from '@/hooks/use-classes';
import { getWalletColor } from '@/lib/wallet-utils';
import { GraduationCap, Search, Phone } from 'lucide-react';
import { useState } from 'react';

export default function TeacherStudents() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: classes, isLoading: classesLoading } = useClasses();
  
  const myClasses = classes?.filter(c => c.teacher_id === teacherId) || [];
  const myStudents = students?.filter(s => s.teacher_id === teacherId) || [];

  const filteredStudents = myStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.phone.includes(search);
    const matchesStatus = !statusFilter || student.status === statusFilter;
    const matchesClass = !classFilter || student.class_id === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  });

  const isLoading = studentsLoading || classesLoading;

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Students</h1>
          <p className="text-muted-foreground">View students in your classes</p>
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
                  <SelectItem value="Grace">Grace</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter || 'all'} onValueChange={(v) => setClassFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {myClasses.map((cls) => (
                    <SelectItem key={cls.class_id} value={cls.class_id}>
                      {cls.name}
                    </SelectItem>
                  ))}
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
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="space-y-3">
                {filteredStudents.map((student) => {
                  const studentClass = myClasses.find(c => c.class_id === student.class_id);
                  return (
                    <div
                      key={student.student_id}
                      className="p-4 rounded-lg border border-border/50 bg-card/50"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{student.name}</p>
                            <Badge
                              variant="outline"
                              className={
                                student.status === 'Active'
                                  ? 'status-active'
                                  : student.status === 'Grace'
                                  ? 'status-grace'
                                  : 'status-blocked'
                              }
                            >
                              {student.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {student.phone}
                            </span>
                            {studentClass && (
                              <span>Class: {studentClass.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-medium ${getWalletColor(student.wallet_balance || 0)}`}>
                            Wallet: {student.wallet_balance} lessons
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No students found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
