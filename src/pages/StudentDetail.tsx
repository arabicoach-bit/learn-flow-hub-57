import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudent, useUpdateStudent } from '@/hooks/use-students';
import { usePackages, Package } from '@/hooks/use-packages';
import { useLessons } from '@/hooks/use-lessons';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, User, Wallet, CreditCard, BookOpen, Loader2, Calendar, Plus, RefreshCw, Pencil, Gift, History } from 'lucide-react';
import { getWalletColor, getStatusBadgeClass, formatCurrency, formatDate, formatDateTime, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { StudentScheduleTab } from '@/components/schedule/StudentScheduleTab';
import { AddPackageForm } from '@/components/packages/AddPackageForm';
import { RenewPackageForm } from '@/components/packages/RenewPackageForm';
import { EditPackageDialog } from '@/components/packages/EditPackageDialog';
import { AddFreeLessonsForm } from '@/components/packages/AddFreeLessonsForm';
import { PackageHistoryTimeline } from '@/components/packages/PackageHistoryTimeline';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'payments';
  const [isEditing, setIsEditing] = useState(false);
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isRenewPackageOpen, setIsRenewPackageOpen] = useState(false);
  const [isAddFreeLessonsOpen, setIsAddFreeLessonsOpen] = useState(false);
  const [renewPackageId, setRenewPackageId] = useState<string | undefined>();
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    parent_phone: '',
    parent_guardian_name: '',
    age: '',
    gender: '',
    nationality: '',
    school: '',
    year_group: '',
    program_id: '',
    student_level: '',
    teacher_id: '',
  });

  const { data: student, isLoading: studentLoading } = useStudent(id || '');
  const packagesQuery = usePackages(id);
  const {
    data: packages,
    isLoading: packagesLoading,
    isFetching: packagesFetching,
    error: packagesError,
    refetch: refetchPackages,
  } = packagesQuery;
  const { data: lessons, isLoading: lessonsLoading } = useLessons({ student_id: id });
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const updateStudent = useUpdateStudent();

  const startEditing = () => {
    if (student) {
      setEditForm({
        name: student.name,
        phone: student.phone,
        parent_phone: student.parent_phone || '',
        parent_guardian_name: student.parent_guardian_name || '',
        age: student.age?.toString() || '',
        gender: student.gender || '',
        nationality: student.nationality || '',
        school: student.school || '',
        year_group: student.year_group || '',
        program_id: student.program_id || '',
        student_level: student.student_level || '',
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
        parent_guardian_name: editForm.parent_guardian_name || null,
        age: editForm.age ? parseInt(editForm.age) : null,
        gender: editForm.gender || null,
        nationality: editForm.nationality || null,
        school: editForm.school || null,
        year_group: editForm.year_group || null,
        program_id: editForm.program_id || null,
        student_level: editForm.student_level || null,
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
                    {getStatusDisplayLabel(student.status)}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.teachers?.name || 'No teacher assigned'}
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

        {/* Add Package Dialog */}
        <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Package for {student.name}</DialogTitle>
            </DialogHeader>
            <AddPackageForm
              studentId={id!}
              studentName={student.name}
              currentWallet={student.wallet_balance || 0}
              onSuccess={() => setIsAddPackageOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Renew Package Dialog */}
        <Dialog open={isRenewPackageOpen} onOpenChange={setIsRenewPackageOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Renew Package for {student.name}</DialogTitle>
            </DialogHeader>
            <RenewPackageForm
              studentId={id!}
              studentName={student.name}
              currentWallet={student.wallet_balance || 0}
              previousPackageId={renewPackageId || student.current_package_id || undefined}
              teacherId={student.teacher_id || undefined}
              onSuccess={() => {
                setIsRenewPackageOpen(false);
                setRenewPackageId(undefined);
              }}
              onCancel={() => {
                setIsRenewPackageOpen(false);
                setRenewPackageId(undefined);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Package Dialog */}
        <EditPackageDialog
          package_={editPackage}
          open={!!editPackage}
          onOpenChange={(open) => !open && setEditPackage(null)}
          onSuccess={() => setEditPackage(null)}
        />

        {/* Add Lesson Dialog */}
        <Dialog open={isAddFreeLessonsOpen} onOpenChange={setIsAddFreeLessonsOpen}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Lesson</DialogTitle>
            </DialogHeader>
            <AddFreeLessonsForm
              studentId={id!}
              studentName={student.name}
              currentWallet={student.wallet_balance || 0}
              onSuccess={() => setIsAddFreeLessonsOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Packages
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Package History
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
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

          <TabsContent value="payments">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Packages</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setIsAddFreeLessonsOpen(true)} className="gap-2">
                    <Gift className="w-4 h-4" />
                    Add Lesson
                  </Button>
                  {packages && packages.length > 0 && (
                    <Button variant="outline" onClick={() => setIsRenewPackageOpen(true)} className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Renew
                    </Button>
                  )}
                  <Button onClick={() => setIsAddPackageOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Package
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : packagesError ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">Couldn't load packages</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {packagesError instanceof Error ? packagesError.message : 'Unknown error'}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => refetchPackages()}
                      className="gap-2"
                      disabled={packagesFetching}
                    >
                      {packagesFetching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Retry
                    </Button>
                  </div>
                ) : !packages?.length ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No packages yet</p>
                    <Button onClick={() => setIsAddPackageOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add First Package
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Package Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Lessons</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((pkg) => (
                        <TableRow key={pkg.package_id}>
                          <TableCell>{formatDate(pkg.payment_date)}</TableCell>
                          <TableCell className="font-medium">{pkg.package_types?.name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{pkg.package_types?.description || '-'}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pkg.amount)}</TableCell>
                          <TableCell>{pkg.lessons_purchased}</TableCell>
                          <TableCell>{pkg.lessons_used}</TableCell>
                          <TableCell>{pkg.lesson_duration ? `${pkg.lesson_duration} mins` : '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={pkg.status === 'Active' ? 'status-active' : 'status-grace'}>
                              {pkg.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditPackage(pkg)}
                                className="gap-1 text-xs"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRenewPackageId(pkg.package_id);
                                  setIsRenewPackageOpen(true);
                                }}
                                className="gap-1 text-xs"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Renew
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Package History Tab */}
          <TabsContent value="history">
            <PackageHistoryTimeline 
              packages={packages} 
              isLoading={packagesLoading} 
              teacherName={student.teachers?.name}
            />
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <StudentScheduleTab studentId={id!} />
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
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{student.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{student.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Parent/Guardian</p>
                        <p className="font-medium">{student.parent_guardian_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Parent Phone</p>
                        <p className="font-medium">{student.parent_phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Age</p>
                        <p className="font-medium">{student.age || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium">{student.gender || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nationality</p>
                        <p className="font-medium">{student.nationality || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">School</p>
                        <p className="font-medium">{student.school || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Year Group</p>
                        <p className="font-medium">{student.year_group || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Program</p>
                        <p className="font-medium">{student.programs?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Level</p>
                        <p className="font-medium">{student.student_level || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Teacher</p>
                        <p className="font-medium">{student.teachers?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Teacher</p>
                        <p className="font-medium">{student.teachers?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="font-medium">{formatCurrency(student.total_paid || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Renewals</p>
                        <p className="font-medium">{student.number_of_renewals || 0}</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent_guardian_name">Parent/Guardian Name</Label>
                        <Input
                          id="parent_guardian_name"
                          value={editForm.parent_guardian_name}
                          onChange={(e) => setEditForm({ ...editForm, parent_guardian_name: e.target.value })}
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
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          value={editForm.age}
                          onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input
                          id="nationality"
                          value={editForm.nationality}
                          onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="school">School</Label>
                        <Input
                          id="school"
                          value={editForm.school}
                          onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="year_group">Year Group</Label>
                        <Input
                          id="year_group"
                          value={editForm.year_group}
                          onChange={(e) => setEditForm({ ...editForm, year_group: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Program</Label>
                        <Select value={editForm.program_id} onValueChange={(v) => setEditForm({ ...editForm, program_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select program" />
                          </SelectTrigger>
                          <SelectContent>
                            {programs?.map((program) => (
                              <SelectItem key={program.program_id} value={program.program_id}>{program.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Level</Label>
                        <Select value={editForm.student_level} onValueChange={(v) => setEditForm({ ...editForm, student_level: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Elementary">Elementary</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
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
