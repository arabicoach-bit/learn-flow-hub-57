import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudents, useCreateStudent } from '@/hooks/use-students';
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
  const { data: teachers } = useTeachers();
  const createStudent = useCreateStudent();

  const PROGRAMMES = ['Arabic A', 'Arabic B', 'IGCSE', 'Adult Course', 'Islamic Arabic'];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    parent_guardian_name: '',
    program: '',
    teacher_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate teacher is selected
    if (!formData.teacher_id) {
      toast({ title: 'Please select a teacher', variant: 'destructive' });
      return;
    }
    
    try {
      await createStudent.mutateAsync({
        name: formData.name,
        phone: formData.phone,
        parent_guardian_name: formData.parent_guardian_name || undefined,
        teacher_id: formData.teacher_id,
      });
      toast({ title: 'Student created successfully!' });
      setIsDialogOpen(false);
      setFormData({ 
        name: '', phone: '', parent_guardian_name: '', program: '', teacher_id: '' 
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Student Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Parent Name</Label>
                  <Input value={formData.parent_guardian_name} onChange={(e) => setFormData({ ...formData, parent_guardian_name: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp Contact *</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Programme</Label>
                  <Select value={formData.program} onValueChange={(v) => setFormData({ ...formData, program: v })}>
                    <SelectTrigger><SelectValue placeholder="Select programme" /></SelectTrigger>
                    <SelectContent>
                      {PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Teacher *</Label>
                  <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers?.map((t) => <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                <th>Programme</th>
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
                      <td>{student.programs?.name || '-'}</td>
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
