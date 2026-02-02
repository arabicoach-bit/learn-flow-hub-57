import { useState } from 'react';
import { Plus, Search, Edit } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useLeads, useCreateLead, type Lead } from '@/hooks/use-leads';
import { usePrograms } from '@/hooks/use-programs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getStatusBadgeClass, formatDate } from '@/lib/wallet-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { EditLeadDialog } from '@/components/leads/EditLeadDialog';

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

export default function Leads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  const { data: leads, isLoading } = useLeads({ search, status: statusFilter || undefined });
  const { data: programs } = usePrograms();
  const createLead = useCreateLead();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    source: '',
    interest: '',
    notes: '',
    first_contact_date: new Date().toISOString().split('T')[0],
    last_contact_date: new Date().toISOString().split('T')[0],
    trial_status: '',
    follow_up: '',
    handled_by: '',
    next_followup_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead.mutateAsync({
        name: formData.name,
        phone: formData.phone,
        source: formData.source || undefined,
        interest: formData.interest || undefined,
        notes: formData.notes || undefined,
        first_contact_date: formData.first_contact_date || undefined,
        last_contact_date: formData.last_contact_date || undefined,
        trial_status: formData.trial_status || undefined,
        follow_up: formData.follow_up || undefined,
        handled_by: formData.handled_by || undefined,
        next_followup_date: formData.next_followup_date || undefined,
      });
      toast({ title: 'Lead created successfully!' });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        phone: '',
        source: '',
        interest: '',
        notes: '',
        first_contact_date: new Date().toISOString().split('T')[0],
        last_contact_date: new Date().toISOString().split('T')[0],
        trial_status: '',
        follow_up: '',
        handled_by: '',
        next_followup_date: '',
      });
    } catch (error) {
      toast({ title: 'Error creating lead', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Leads CRM</h1>
            <p className="text-muted-foreground">Track and manage potential students</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      placeholder="Enter name"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Contact *</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                      placeholder="00971-50-123-456"
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Contact Date</Label>
                    <Input 
                      type="date" 
                      value={formData.first_contact_date} 
                      onChange={(e) => setFormData({ ...formData, first_contact_date: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Contact Date</Label>
                    <Input 
                      type="date" 
                      value={formData.last_contact_date} 
                      onChange={(e) => setFormData({ ...formData, last_contact_date: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
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
                    <Label>Interested Programme</Label>
                    <Select value={formData.interest} onValueChange={(v) => setFormData({ ...formData, interest: v })}>
                      <SelectTrigger><SelectValue placeholder="Select programme" /></SelectTrigger>
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
                    <Label>Trial Status</Label>
                    <Select value={formData.trial_status} onValueChange={(v) => setFormData({ ...formData, trial_status: v })}>
                      <SelectTrigger><SelectValue placeholder="Select trial status" /></SelectTrigger>
                      <SelectContent>
                        {trialStatusOptions.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Follow-Up</Label>
                    <Select value={formData.follow_up} onValueChange={(v) => setFormData({ ...formData, follow_up: v })}>
                      <SelectTrigger><SelectValue placeholder="Select follow-up" /></SelectTrigger>
                      <SelectContent>
                        {followUpOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Handled By</Label>
                    <Input 
                      value={formData.handled_by} 
                      onChange={(e) => setFormData({ ...formData, handled_by: e.target.value })} 
                      placeholder="Who is handling this lead?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Follow-up Date</Label>
                    <Input 
                      type="date" 
                      value={formData.next_followup_date} 
                      onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createLead.isPending}>
                  {createLead.isPending ? 'Creating...' : 'Create Lead'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Interested">Interested</SelectItem>
              <SelectItem value="Converted">Converted</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Programme</th>
                <th>Trial Status</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Handled By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9}><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : leads?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">No leads found</td>
                </tr>
              ) : (
                leads?.map((lead) => (
                  <tr key={lead.lead_id}>
                    <td className="font-medium">{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td>{lead.source || '-'}</td>
                    <td>{lead.interest || '-'}</td>
                    <td>{lead.trial_status || '-'}</td>
                    <td>
                      <Badge variant="outline" className={getStatusBadgeClass(lead.status)}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td>{lead.follow_up || '-'}</td>
                    <td>{lead.handled_by || '-'}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingLead(lead)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Lead Dialog */}
        <EditLeadDialog
          lead={editingLead}
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
        />
      </div>
    </AdminLayout>
  );
}
