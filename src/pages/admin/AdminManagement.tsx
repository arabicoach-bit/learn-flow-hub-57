import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAdminUsers } from '@/hooks/use-audit-log';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Shield, UserPlus, Key, Trash2, Copy } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  last_login: string | null;
  created_at: string;
  is_active: boolean;
}

export default function AdminManagement() {
  const queryClient = useQueryClient();
  const { data: admins = [], isLoading, refetch } = useAdminUsers() as { data: AdminProfile[]; isLoading: boolean; refetch: () => void };
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [deleteAdmin, setDeleteAdmin] = useState<{ id: string; name: string } | null>(null);
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<{ id: string; name: string } | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-account', {
        headers: { 'x-action': 'create' },
        body: { name: name.trim(), email: email.trim() },
      });

      if (error) throw new Error('Failed to create admin');
      if (!data?.success) throw new Error(data?.error || 'Failed to create admin');

      setTempPassword(data.temp_password);
      toast.success('Admin account created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-account', {
        headers: { 'x-action': 'reset-password' },
        body: { user_id: userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResetResult(data.temp_password);
      toast.success('Password reset successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  const handleDelete = async () => {
    if (!deleteAdmin) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-account', {
        headers: { 'x-action': 'delete' },
        body: { user_id: deleteAdmin.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Admin account deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      refetch();
      setDeleteAdmin(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete admin');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Admin Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage admin accounts for your team
            </p>
          </div>

          <Dialog open={addOpen} onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) {
              setName('');
              setEmail('');
              setTempPassword(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" /> Add Admin</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Admin Account</DialogTitle>
                <DialogDescription>Create a new admin account with full system access.</DialogDescription>
              </DialogHeader>

              {tempPassword ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 mb-2">✅ Admin account created!</p>
                    <p className="text-sm text-green-700 mb-3">Share these credentials securely:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Email:</span>
                        <code className="text-sm bg-white px-2 py-1 rounded">{email}</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(email)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Password:</span>
                        <code className="text-sm bg-white px-2 py-1 rounded">{tempPassword}</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(tempPassword)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setAddOpen(false); setTempPassword(null); setName(''); setEmail(''); }}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Admin name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreate} disabled={creating}>
                      {creating ? 'Creating...' : 'Create Admin'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Admin list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Admin Accounts ({admins.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : admins.map(admin => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.full_name}</TableCell>
                    <TableCell className="text-sm">{admin.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {admin.last_login 
                        ? formatDistanceToNow(new Date(admin.last_login), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResetPassword({ id: admin.id, name: admin.full_name });
                            handleResetPassword(admin.id);
                          }}
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteAdmin({ id: admin.id, name: admin.full_name })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Reset password result dialog */}
        <Dialog open={!!resetResult} onOpenChange={(open) => { if (!open) { setResetResult(null); setResetPassword(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Password Reset</DialogTitle>
              <DialogDescription>New temporary password for {resetPassword?.name}</DialogDescription>
            </DialogHeader>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">New Password:</span>
                <code className="text-sm bg-white px-2 py-1 rounded">{resetResult}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(resetResult || '')}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { setResetResult(null); setResetPassword(null); }}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <DeleteConfirmDialog
          open={!!deleteAdmin}
          onOpenChange={(open) => !open && setDeleteAdmin(null)}
          onConfirm={handleDelete}
          title="Delete Admin"
          entityName={deleteAdmin?.name}
          description="This will permanently remove this admin account and revoke all access."
        />
      </div>
    </AdminLayout>
  );
}
