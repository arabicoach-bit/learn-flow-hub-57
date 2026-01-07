import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudent, useUpdateStudent } from '@/hooks/use-students';
import { usePackages } from '@/hooks/use-packages';
import { useLessons } from '@/hooks/use-lessons';
import { useClasses } from '@/hooks/use-classes';
import { useTeachers } from '@/hooks/use-teachers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, User, Wallet, CreditCard, BookOpen, Loader2 } from 'lucide-react';
import { getWalletColor, getStatusBadgeClass, formatCurrency, formatDate, formatDateTime } from '@/lib/wallet-utils';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    parent_phone: '',
    class_id: '',
    teacher_id: '',
  });

  const { data: student, isLoading: studentLoading } = useStudent(id || '');
  const { data: packages, isLoading: packagesLoading } = usePackages(id);
  const { data: lessons, isLoading: lessonsLoading } = useLessons({ student_id: id });
  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers();
  const updateStudent = useUpdateStudent();

  const startEditing = () => {
    if (student) {
      setEditForm({
        name: student.name,
        phone: student.phone,
        parent_phone: student.parent_phone || '',
        class_id: student.class_id || '',
        teacher_id: student.teacher_id || '',
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    try {
      await updateStudent.mutateAsync({
        studentId: id,
        name: editForm.name,
        phone: editForm.phone,
        parent_phone: editForm.parent_phone || null,
        class_id: editForm.class_id || null,
        teacher_id: editForm.teacher_id || null,
      });
      toast.success('Student updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update student');
    }
  };

  if (studentLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!student) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Student not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/students')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/students')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold">{student.name}</h1>
            <p className="text-muted-foreground">{student.phone}</p>
          </div>
        </div>

        {/* Student Info Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <Badge className={getStatusBadgeClass(student.status)}>
                    {student.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.classes?.name || 'No class'} • {student.teachers?.name || 'No teacher'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6" style={{ color: `hsl(${getWalletColor(student.wallet_balance)})` }} />
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                  <p 
                    className="text-3xl font-bold"
                    style={{ color: `hsl(${getWalletColor(student.wallet_balance)})` }}
                  >
                    {student.wallet_balance}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment History
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Lesson History
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Edit Info
            </TabsTrigger>
          </TabsList>

          {/* Payment History Tab */}
          <TabsContent value="payments">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : !packages?.length ? (
                  <p className="text-muted-foreground text-center py-8">No payment history</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Lessons</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((pkg) => (
                        <TableRow key={pkg.package_id}>
                          <TableCell>{formatDate(pkg.payment_date)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pkg.amount)}</TableCell>
                          <TableCell>{pkg.lessons_purchased}</TableCell>
                          <TableCell>{pkg.lessons_used}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={pkg.status === 'Active' ? 'status-active' : 'status-grace'}>
                              {pkg.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lesson History Tab */}
          <TabsContent value="lessons">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Lesson History</CardTitle>
              </CardHeader>
              <CardContent>
                {lessonsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : !lessons?.length ? (
                  <p className="text-muted-foreground text-center py-8">No lesson history</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons.map((lesson) => (
                        <TableRow key={lesson.lesson_id}>
                          <TableCell>{formatDateTime(lesson.date)}</TableCell>
                          <TableCell>{lesson.classes?.name || '-'}</TableCell>
                          <TableCell>{lesson.teachers?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                lesson.status === 'Taken' ? 'status-active' :
                                lesson.status === 'Absent' ? 'status-blocked' : 'status-grace'
                              }
                            >
                              {lesson.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{lesson.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edit Info Tab */}
          <TabsContent value="edit">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Edit Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{student.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{student.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Parent Phone</p>
                        <p className="font-medium">{student.parent_phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Class</p>
                        <p className="font-medium">{student.classes?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Teacher</p>
                        <p className="font-medium">{student.teachers?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="font-medium">{formatDate(student.created_at)}</p>
                      </div>
                    </div>
                    <Button onClick={startEditing}>Edit Information</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent_phone">Parent Phone</Label>
                        <Input
                          id="parent_phone"
                          value={editForm.parent_phone}
                          onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select value={editForm.class_id} onValueChange={(v) => setEditForm({ ...editForm, class_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes?.map((cls) => (
                              <SelectItem key={cls.class_id} value={cls.class_id}>{cls.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Teacher</Label>
                        <Select value={editForm.teacher_id} onValueChange={(v) => setEditForm({ ...editForm, teacher_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers?.map((teacher) => (
                              <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={updateStudent.isPending}>
                        {updateStudent.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
