import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudents } from '@/hooks/use-students';
import { useAddPackage, useRecentPackages } from '@/hooks/use-packages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate, getWalletColor } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function Payments() {
  const { toast } = useToast();
  const { data: students } = useStudents();
  const { data: recentPayments, isLoading } = useRecentPackages(20);
  const addPackage = useAddPackage();

  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    lessons_purchased: '',
  });

  const selectedStudent = students?.find((s) => s.student_id === formData.student_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.amount || !formData.lessons_purchased) return;

    try {
      const result = await addPackage.mutateAsync({
        student_id: formData.student_id,
        amount: parseFloat(formData.amount),
        lessons_purchased: parseInt(formData.lessons_purchased),
      });
      toast({
        title: 'Payment recorded!',
        description: `New wallet balance: ${result.new_wallet} lessons`,
      });
      setFormData({ student_id: '', amount: '', lessons_purchased: '' });
    } catch (error) {
      toast({ title: 'Error recording payment', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Payments</h1>
          <p className="text-muted-foreground">Record payments and manage packages</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add Payment Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Add New Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Student *</Label>
                  <Select value={formData.student_id} onValueChange={(v) => setFormData({ ...formData, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Search student..." /></SelectTrigger>
                    <SelectContent>
                      {students?.map((s) => (
                        <SelectItem key={s.student_id} value={s.student_id}>
                          {s.name} ({s.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStudent && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">Current Wallet Balance</p>
                    <p className={`text-2xl font-bold ${getWalletColor(selectedStudent.wallet_balance)}`}>
                      {selectedStudent.wallet_balance} lessons
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lessons *</Label>
                    <Input
                      type="number"
                      value={formData.lessons_purchased}
                      onChange={(e) => setFormData({ ...formData, lessons_purchased: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={addPackage.isPending}>
                  {addPackage.isPending ? 'Processing...' : 'Record Payment'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : recentPayments?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {recentPayments?.map((payment) => (
                    <div key={payment.package_id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{payment.students?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(payment.payment_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-muted-foreground">{payment.lessons_purchased} lessons</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
