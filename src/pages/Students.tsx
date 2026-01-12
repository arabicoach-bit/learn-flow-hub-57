import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudents, useCreateStudent } from '@/hooks/use-students';
import { useClasses } from '@/hooks/use-classes';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getWalletColor, getStatusBadgeClass } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function Students() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: students, isLoading } = useStudents({ search, status: statusFilter || undefined });
  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const createStudent = useCreateStudent();

  const [formData, setFormData] = useState({
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
    class_id: '',
    teacher_id: '',
    initial_amount: '',
    initial_lessons: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStudent.mutateAsync({
        name: formData.name,
        phone: formData.phone,
        parent_phone: formData.parent_phone || undefined,
        parent_guardian_name: formData.parent_guardian_name || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
        nationality: formData.nationality || undefined,
        school: formData.school || undefined,
        year_group: formData.year_group || undefined,
        program_id: formData.program_id || undefined,
        student_level: formData.student_level || undefined,
        class_id: formData.class_id || undefined,
        teacher_id: formData.teacher_id || undefined,
        initial_amount: formData.initial_amount ? parseFloat(formData.initial_amount) : undefined,
        initial_lessons: formData.initial_lessons ? parseInt(formData.initial_lessons) : undefined,
      });
      toast({ title: 'Student created successfully!' });
      setIsDialogOpen(false);
      setFormData({ 
        name: '', phone: '', parent_phone: '', parent_guardian_name: '',
        age: '', gender: '', nationality: '', school: '', year_group: '',
        program_id: '', student_level: '', class_id: '', teacher_id: '', 
        initial_amount: '', initial_lessons: '' 
      });
    } catch (error) {
      toast({ title: 'Error creating student', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Students</h1>
            <p className="text-muted-foreground">Manage your academy students</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp Contact *</Label>
                      <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Parent/Guardian Name</Label>
                      <Input value={formData.parent_guardian_name} onChange={(e) => setFormData({ ...formData, parent_guardian_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Parent Phone</Label>
                      <Input value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nationality</Label>
                      <Input value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>School</Label>
                      <Input value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Year Group</Label>
                      <Input value={formData.year_group} onChange={(e) => setFormData({ ...formData, year_group: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Program</Label>
                      <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                        <SelectContent>
                          {programs?.map((p) => <SelectItem key={p.program_id} value={p.program_id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Level</Label>
                      <Select value={formData.student_level} onValueChange={(v) => setFormData({ ...formData, student_level: v })}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Elementary">Elementary</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {classes?.map((c) => <SelectItem key={c.class_id} value={c.class_id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Teacher</Label>
                      <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {teachers?.map((t) => <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Initial Amount (AED)</Label>
                      <Input type="number" step="0.01" value={formData.initial_amount} onChange={(e) => setFormData({ ...formData, initial_amount: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Initial Lessons</Label>
                      <Input type="number" value={formData.initial_lessons} onChange={(e) => setFormData({ ...formData, initial_lessons: e.target.value })} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createStudent.isPending}>
                    {createStudent.isPending ? 'Creating...' : 'Create Student'}
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Grace">Grace</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Class</th>
                <th>Teacher</th>
                <th>Wallet</th>
                <th>Payment Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : students?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">No students found</td>
                </tr>
              ) : (
                students?.map((student) => {
                  // Determine payment status based on wallet balance
                  const wallet = student.wallet_balance || 0;
                  let paymentStatus = 'Paid';
                  let paymentBadgeClass = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
                  
                  if (wallet <= 0) {
                    paymentStatus = 'Overdue';
                    paymentBadgeClass = 'bg-red-500/20 text-red-700 dark:text-red-300';
                  } else if (wallet <= 2) {
                    paymentStatus = 'Due Soon';
                    paymentBadgeClass = 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
                  }

                  return (
                    <tr 
                      key={student.student_id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/students/${student.student_id}`)}
                    >
                      <td className="font-medium">{student.name}</td>
                      <td>{student.phone}</td>
                      <td>{student.classes?.name || '-'}</td>
                      <td>{student.teachers?.name || '-'}</td>
                      <td>
                        <span 
                          className={`font-bold px-2 py-0.5 rounded ${getWalletColor(student.wallet_balance)}`}
                          style={{ 
                            backgroundColor: wallet >= 5 ? 'rgb(16 185 129 / 0.15)' :
                                            wallet >= 3 ? 'rgb(132 204 22 / 0.15)' :
                                            wallet >= 1 ? 'rgb(245 158 11 / 0.15)' :
                                            wallet === 0 ? 'rgb(249 115 22 / 0.15)' :
                                            wallet >= -2 ? 'rgb(239 68 68 / 0.15)' :
                                            'rgb(127 29 29 / 0.15)'
                          }}
                        >
                          {student.wallet_balance}
                        </span>
                      </td>
                      <td>
                        <Badge variant="outline" className={paymentBadgeClass}>
                          {paymentStatus}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant="outline" className={getStatusBadgeClass(student.status)}>
                          {student.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
