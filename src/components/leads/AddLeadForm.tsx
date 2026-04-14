import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateLead } from '@/hooks/use-leads';
import { usePrograms } from '@/hooks/use-programs';
import { useToast } from '@/hooks/use-toast';

const initialForm = {
  name: '',
  phone: '',
  source: '',
  interest: '',
  first_contact_date: new Date().toISOString().split('T')[0],
};

export function AddLeadForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const createLead = useCreateLead();
  const { data: programs } = usePrograms();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead.mutateAsync({
        name: formData.name,
        phone: formData.phone,
        source: formData.source || undefined,
        interest: formData.interest || undefined,
        first_contact_date: formData.first_contact_date || undefined,
      });
      toast({ title: 'Lead created successfully!' });
      setOpen(false);
      setFormData(initialForm);
    } catch {
      toast({ title: 'Error creating lead', variant: 'destructive' });
    }
  };

  const update = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add Lead</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={formData.name} onChange={e => update('name', e.target.value)} placeholder="Enter name" required />
          </div>

          <div className="space-y-2">
            <Label>WhatsApp Contact *</Label>
            <Input value={formData.phone} onChange={e => update('phone', e.target.value)} placeholder="00971-50-123-456" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={formData.source} onValueChange={v => update('source', v)}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {['WhatsApp', 'Facebook', 'Instagram', 'Referral', 'Website', 'Other'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>First Contact Date</Label>
              <Input type="date" value={formData.first_contact_date} onChange={e => update('first_contact_date', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interested Programme</Label>
            <Select value={formData.interest} onValueChange={v => update('interest', v)}>
              <SelectTrigger><SelectValue placeholder="Select programme" /></SelectTrigger>
              <SelectContent>
                {programs?.map(p => <SelectItem key={p.program_id} value={p.name}>{p.name}</SelectItem>)}
                <SelectItem value="Arabic B student">Arabic B student</SelectItem>
                <SelectItem value="IGCSE">IGCSE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={createLead.isPending}>
            {createLead.isPending ? 'Creating...' : 'Create Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
