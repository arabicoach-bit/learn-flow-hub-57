import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTeachers, useCreateTeacher } from '@/hooks/use-teachers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function Teachers() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { data: teachers, isLoading } = useTeachers();
  const createTeacher = useCreateTeacher();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    rate_per_lesson: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTeacher.mutateAsync({
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        rate_per_lesson: formData.rate_per_lesson ? parseFloat(formData.rate_per_lesson) : undefined,
      });
      toast({ title: 'Teacher created successfully!' });
      setIsDialogOpen(false);
      setFormData({ name: '', phone: '', email: '', rate_per_lesson: '' });
    } catch (error) {
      toast({ title: 'Error creating teacher', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Teachers</h1>
            <p className="text-muted-foreground">Manage your academy teachers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Lesson ($)</Label>
                  <Input type="number" step="0.01" value={formData.rate_per_lesson} onChange={(e) => setFormData({ ...formData, rate_per_lesson: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={createTeacher.isPending}>
                  {createTeacher.isPending ? 'Creating...' : 'Create Teacher'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Rate/Lesson</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4}><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : teachers?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">No teachers found</td>
                </tr>
              ) : (
                teachers?.map((teacher) => (
                  <tr
                    key={teacher.teacher_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
                  >
                    <td className="font-medium">{teacher.name}</td>
                    <td>{teacher.phone || '-'}</td>
                    <td>{teacher.email || '-'}</td>
                    <td>{formatCurrency(teacher.rate_per_lesson)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
