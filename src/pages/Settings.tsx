import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useClasses, useCreateClass, useDeleteClass } from '@/hooks/use-classes';
import { useTeachers } from '@/hooks/use-teachers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: teachers } = useTeachers();
  const createClass = useCreateClass();
  const deleteClass = useDeleteClass();

  const [classForm, setClassForm] = useState({ name: '', schedule: '', teacher_id: '' });

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClass.mutateAsync({
        name: classForm.name,
        schedule: classForm.schedule || undefined,
        teacher_id: classForm.teacher_id || undefined,
      });
      toast({ title: 'Class created!' });
      setClassForm({ name: '', schedule: '', teacher_id: '' });
    } catch (error) {
      toast({ title: 'Error creating class', variant: 'destructive' });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await deleteClass.mutateAsync(classId);
      toast({ title: 'Class deleted!' });
    } catch (error) {
      toast({ title: 'Error deleting class', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your academy settings</p>
        </div>

        <Tabs defaultValue="classes">
          <TabsList>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="config">System Config</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6 mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Add New Class</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateClass} className="flex gap-4 flex-wrap items-end">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <Label>Class Name *</Label>
                    <Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <Label>Schedule</Label>
                    <Input value={classForm.schedule} onChange={(e) => setClassForm({ ...classForm, schedule: e.target.value })} placeholder="e.g., Mon/Wed 5PM" />
                  </div>
                  <div className="space-y-2 w-[200px]">
                    <Label>Teacher</Label>
                    <Select value={classForm.teacher_id} onValueChange={(v) => setClassForm({ ...classForm, teacher_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {teachers?.map((t) => <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={createClass.isPending}>
                    <Plus className="w-4 h-4 mr-2" /> Add Class
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Existing Classes</CardTitle>
              </CardHeader>
              <CardContent>
                {classesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : classes?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No classes yet</p>
                ) : (
                  <div className="space-y-3">
                    {classes?.map((cls) => (
                      <div
                        key={cls.class_id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/admin/classes/${cls.class_id}`)}
                      >
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cls.schedule || 'No schedule'} • {cls.teachers?.name || 'No teacher'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.class_id); }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">System configuration options will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
