import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useStudents, useCreateStudent } from '@/hooks/use-students';
import { useClasses } from '@/hooks/use-classes';
import { useTeachers } from '@/hooks/use-teachers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const createStudent = useCreateStudent();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    parent_phone: '',
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
        class_id: formData.class_id || undefined,
        teacher_id: formData.teacher_id || undefined,
        initial_amount: formData.initial_amount ? parseFloat(formData.initial_amount) : undefined,
        initial_lessons: formData.initial_lessons ? parseInt(formData.initial_lessons) : undefined,
      });
      toast({ title: 'Student created successfully!' });
      setIsDialogOpen(false);
      setFormData({ name: '', phone: '', parent_phone: '', class_id: '', teacher_id: '', initial_amount: '', initial_lessons: '' });
    } catch (error) {
      toast({ title: 'Error creating student', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Parent Phone</Label>
                  <Input value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} />
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
                    <Label>Initial Amount</Label>
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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : students?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">No students found</td>
                </tr>
              ) : (
                students?.map((student) => (
                  <tr 
                    key={student.student_id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/students/${student.student_id}`)}
                  >
                    <td className="font-medium">{student.name}</td>
                    <td>{student.phone}</td>
                    <td>{student.classes?.name || '-'}</td>
                    <td>{student.teachers?.name || '-'}</td>
                    <td>
                      <span 
                        className="font-bold px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `hsl(${getWalletColor(student.wallet_balance)} / 0.15)`,
                          color: `hsl(${getWalletColor(student.wallet_balance)})`
                        }}
                      >
                        {student.wallet_balance}
                      </span>
                    </td>
                    <td>
                      <Badge variant="outline" className={getStatusBadgeClass(student.status)}>
                        {student.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
