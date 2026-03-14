import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { usePackageTypes } from '@/hooks/use-package-types';
import { Package } from '@/hooks/use-packages';

interface EditPackageDialogProps {
  package_: Package | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPackageDialog({ package_, open, onOpenChange, onSuccess }: EditPackageDialogProps) {
  const queryClient = useQueryClient();
  const { data: packageTypes } = usePackageTypes();
  
  const [formData, setFormData] = useState({
    package_type_id: '',
    amount: '',
    lessons_purchased: '',
    lessons_used: '',
    lesson_duration: '',
    start_date: '',
    payment_status: 'Pending',
    due_date: '',
    paid_date: '',
  });

  useEffect(() => {
    if (package_) {
      setFormData({
        package_type_id: package_.package_type_id || '',
        amount: package_.amount.toString(),
        lessons_purchased: package_.lessons_purchased.toString(),
        lessons_used: (package_.lessons_used || 0).toString(),
        lesson_duration: (package_.lesson_duration || '').toString(),
        start_date: package_.start_date || '',
        payment_status: (package_ as any)
          .payment_status || 'Pending',
        due_date: (package_ as any).due_date || '',
        paid_date: (package_ as any).paid_date
          ? new Date((package_ as any).paid_date)
              .toISOString().split('T')[0]
          : '',
      });
    }
  }, [package_]);

  const updatePackage = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!package_) throw new Error('No package to update');
      
      const { error } = await supabase
        .from('packages')
        .update({
          package_type_id: data.package_type_id || null,
          amount: parseFloat(data.amount),
          lessons_purchased: parseInt(data.lessons_purchased),
          lessons_used: parseInt(data.lessons_used),
          lesson_duration: data.lesson_duration ? parseInt(data.lesson_duration) : null,
          start_date: data.start_date || null,
          payment_status: data.payment_status,
          due_date: data.payment_status === 'Pending'
            ? data.due_date || null : null,
          paid_date: data.payment_status === 'Paid'
            && data.paid_date
              ? new Date(data.paid_date).toISOString()
              : null,
        })
        .eq('package_id', package_.package_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages-recent'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
      toast.success('Package updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update package');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.lessons_purchased) {
      toast.error('Please fill in required fields');
      return;
    }
    
    updatePackage.mutate(formData);
  };

  if (!package_) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Package</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Package Type</Label>
            <Select 
              value={formData.package_type_id} 
              onValueChange={(v) => setFormData({ ...formData, package_type_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select package type" />
              </SelectTrigger>
              <SelectContent>
                {packageTypes?.map((type) => (
                  <SelectItem key={type.package_type_id} value={type.package_type_id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (AED) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lesson_duration">Lesson Duration (mins)</Label>
              <Input
                id="lesson_duration"
                type="number"
                value={formData.lesson_duration}
                onChange={(e) => setFormData({ ...formData, lesson_duration: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lessons_purchased">Lessons Purchased *</Label>
              <Input
                id="lessons_purchased"
                type="number"
                value={formData.lessons_purchased}
                onChange={(e) => setFormData({ ...formData, lessons_purchased: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lessons_used">Lessons Used</Label>
              <Input
                id="lessons_used"
                type="number"
                value={formData.lessons_used}
                onChange={(e) => setFormData({ ...formData, lessons_used: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
          </div>

          <div className="space-y-2">
            <Label>Package Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v: 'Running' | 'Completed') =>
                setFormData({ ...formData, status: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Running">Running</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Payment</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(v) => setFormData({
                    ...formData, payment_status: v
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {formData.payment_status === 'Paid'
                    ? 'Paid Date' : 'Due Date'}
                </Label>
                <Input
                  type="date"
                  value={formData.payment_status === 'Paid'
                    ? formData.paid_date
                    : formData.due_date}
                  onChange={(e) =>
                    formData.payment_status === 'Paid'
                      ? setFormData({
                          ...formData,
                          paid_date: e.target.value
                        })
                      : setFormData({
                          ...formData,
                          due_date: e.target.value
                        })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePackage.isPending}>
              {updatePackage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
