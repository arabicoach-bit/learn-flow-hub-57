import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateLead, type Lead } from '@/hooks/use-leads';
import { usePrograms } from '@/hooks/use-programs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const trialStatusOptions = [
  'Trial Booked',
  'Pending',
  'Price Negotiation',
  'Lost',
];

const followUpOptions = [
  'F.1 – Student Motivation',
  'F.2 – Free Resources',
  'F.3 – Parent Feedback',
  'F.4 – Special Offer',
  'F.5 – Help Offer',
  'F.6 – Soft Reminder',
  'F.7 – Arabic Challenge',
];

interface EditLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLeadDialog({ lead, open, onOpenChange }: EditLeadDialogProps) {
  const { toast } = useToast();
  const updateLead = useUpdateLead();
  const { data: programs } = usePrograms();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    source: '',
    interest: '',
    status: '' as Lead['status'] | '',
    first_contact_date: '',
    last_contact_date: '',
    trial_status: '',
    follow_up: '',
    handled_by: '',
    next_followup_date: '',
    notes: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        phone: lead.phone || '',
        source: lead.source || '',
        interest: lead.interest || '',
        status: lead.status || '',
        first_contact_date: lead.first_contact_date || '',
        last_contact_date: lead.last_contact_date || '',
        trial_status: lead.trial_status || '',
        follow_up: lead.follow_up || '',
        handled_by: lead.handled_by || '',
        next_followup_date: lead.next_followup_date || '',
        notes: lead.notes || '',
      });
    }
  }, [lead]);

  const handleSave = async () => {
    if (!lead) return;

    try {
      await updateLead.mutateAsync({
        leadId: lead.lead_id,
        name: formData.name,
        phone: formData.phone,
        source: formData.source || undefined,
        interest: formData.interest || undefined,
        status: formData.status as Lead['status'] || undefined,
        first_contact_date: formData.first_contact_date || undefined,
        last_contact_date: formData.last_contact_date || undefined,
        trial_status: formData.trial_status || undefined,
        follow_up: formData.follow_up || undefined,
        handled_by: formData.handled_by || undefined,
        next_followup_date: formData.next_followup_date || undefined,
        notes: formData.notes || undefined,
      });

      toast({
        title: 'Lead updated',
        description: 'Changes saved successfully.',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lead.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Contact *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="00971-50-123-456"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_contact_date">First Contact Date</Label>
              <Input
                id="first_contact_date"
                type="date"
                value={formData.first_contact_date}
                onChange={(e) => setFormData({ ...formData, first_contact_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_contact_date">Last Contact Date</Label>
              <Input
                id="last_contact_date"
                type="date"
                value={formData.last_contact_date}
                onChange={(e) => setFormData({ ...formData, last_contact_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest">Interested Programme</Label>
              <Select
                value={formData.interest}
                onValueChange={(value) => setFormData({ ...formData, interest: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map(program => (
                    <SelectItem key={program.program_id} value={program.name}>
                      {program.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Arabic B student">Arabic B student</SelectItem>
                  <SelectItem value="IGCSE">IGCSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trial_status">Trial Status</Label>
              <Select
                value={formData.trial_status}
                onValueChange={(value) => setFormData({ ...formData, trial_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trial status" />
                </SelectTrigger>
                <SelectContent>
                  {trialStatusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Lead Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Lead['status'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Interested">Interested</SelectItem>
                  <SelectItem value="Converted">Converted</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="follow_up">Follow-Up</Label>
              <Select
                value={formData.follow_up}
                onValueChange={(value) => setFormData({ ...formData, follow_up: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select follow-up" />
                </SelectTrigger>
                <SelectContent>
                  {followUpOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="handled_by">Handled By</Label>
              <Input
                id="handled_by"
                value={formData.handled_by}
                onChange={(e) => setFormData({ ...formData, handled_by: e.target.value })}
                placeholder="Who is handling this lead?"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_followup_date">Next Follow-up Date</Label>
            <Input
              id="next_followup_date"
              type="date"
              value={formData.next_followup_date}
              onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateLead.isPending}>
            {updateLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
