import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateLead } from '@/hooks/use-leads';
import { usePrograms } from '@/hooks/use-programs';
import { useToast } from '@/hooks/use-toast';

const trialStatusOptions = ['Trial Booked', 'Pending', 'Price Negotiation', 'Lost'];
const followUpOptions = [
  'F.1 – Student Motivation', 'F.2 – Free Resources', 'F.3 – Parent Feedback',
  'F.4 – Special Offer', 'F.5 – Help Offer', 'F.6 – Soft Reminder', 'F.7 – Arabic Challenge',
];

const initialForm = {
  name: '', phone: '', source: '', interest: '', notes: '',
  first_contact_date: new Date().toISOString().split('T')[0],
  last_contact_date: new Date().toISOString().split('T')[0],
  trial_status: '', follow_up: '', handled_by: '', next_followup_date: '',
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
        name: formData.name, phone: formData.phone,
        source: formData.source || undefined, interest: formData.interest || undefined,
        notes: formData.notes || undefined, first_contact_date: formData.first_contact_date || undefined,
        last_contact_date: formData.last_contact_date || undefined,
        trial_status: formData.trial_status || undefined, follow_up: formData.follow_up || undefined,
        handled_by: formData.handled_by || undefined, next_followup_date: formData.next_followup_date || undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => update('name', e.target.value)} placeholder="Enter name" required />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Contact *</Label>
              <Input value={formData.phone} onChange={e => update('phone', e.target.value)} placeholder="00971-50-123-456" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Contact Date</Label>
              <Input type="date" value={formData.first_contact_date} onChange={e => update('first_contact_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Contact Date</Label>
              <Input type="date" value={formData.last_contact_date} onChange={e => update('last_contact_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trial Status</Label>
              <Select value={formData.trial_status} onValueChange={v => update('trial_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select trial status" /></SelectTrigger>
                <SelectContent>
                  {trialStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Follow-Up Stage</Label>
              <Select value={formData.follow_up} onValueChange={v => update('follow_up', v)}>
                <SelectTrigger><SelectValue placeholder="Select follow-up" /></SelectTrigger>
                <SelectContent>
                  {followUpOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Handled By</Label>
              <Input value={formData.handled_by} onChange={e => update('handled_by', e.target.value)} placeholder="Who is handling this lead?" />
            </div>
            <div className="space-y-2">
              <Label>Next Follow-up Date</Label>
              <Input type="date" value={formData.next_followup_date} onChange={e => update('next_followup_date', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={e => update('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>

          <Button type="submit" className="w-full" disabled={createLead.isPending}>
            {createLead.isPending ? 'Creating...' : 'Create Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
