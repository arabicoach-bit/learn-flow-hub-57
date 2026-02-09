import { useState } from 'react';
import { Plus, Search, Download, Users, Clock, CheckCircle, XCircle, DollarSign, Loader2, CalendarDays } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useLeads, useCreateLead, useUpdateLead, type Lead } from '@/hooks/use-leads';
import { usePrograms } from '@/hooks/use-programs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { EditLeadDialog } from '@/components/leads/EditLeadDialog';
import { LeadCard } from '@/components/leads/LeadCard';
import { exportLeads, type LeadExport } from '@/lib/excel-export';

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
  const [trialStatusFilter, setTrialStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  const { data: leads, isLoading } = useLeads({
    search,
    trial_status: trialStatusFilter === 'all' ? undefined : trialStatusFilter,
    date_range: dateFilter === 'all' ? undefined : dateFilter,
  });
  const { data: programs } = usePrograms();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

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

  const handleUpdateTrialStatus = async (leadId: string, trialStatus: string) => {
    try {
      await updateLead.mutateAsync({ leadId, trial_status: trialStatus });
      toast({ title: 'Trial status updated', description: `Lead marked as ${trialStatus}.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update trial status.', variant: 'destructive' });
    }
  };

  const handleUpdateFollowUp = async (leadId: string, followUp: string) => {
    try {
      await updateLead.mutateAsync({ leadId, follow_up: followUp });
      toast({ title: 'Follow-up updated', description: `Follow-up set to ${followUp}.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update follow-up.', variant: 'destructive' });
    }
  };

  // Stats based on trial_status
  const stats = {
    total: leads?.length || 0,
    trialBooked: leads?.filter(l => l.trial_status === 'Trial Booked').length || 0,
    pending: leads?.filter(l => l.trial_status === 'Pending').length || 0,
    priceNegotiation: leads?.filter(l => l.trial_status === 'Price Negotiation').length || 0,
    lost: leads?.filter(l => l.trial_status === 'Lost').length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Leads CRM</h1>
            <p className="text-muted-foreground">Track and manage potential students</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!leads || leads.length === 0) {
                  toast({ title: 'No data to export', variant: 'destructive' });
                  return;
                }
                const exportData: LeadExport[] = leads.map(l => ({
                  name: l.name,
                  phone: l.phone,
                  source: l.source,
                  interest: l.interest,
                  status: l.status,
                  first_contact_date: l.first_contact_date,
                  last_contact_date: l.last_contact_date,
                  next_followup_date: l.next_followup_date,
                  handled_by: l.handled_by,
                  trial_status: l.trial_status,
                  follow_up: l.follow_up,
                  notes: l.notes,
                  created_at: l.created_at,
                }));
                exportLeads(exportData);
                toast({ title: 'Exported successfully!' });
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <Label>Follow-Up Stage</Label>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Total Leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Trial Booked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-bold">{stats.trialBooked}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Price Negotiation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-400" />
                <span className="text-2xl font-bold">{stats.priceNegotiation}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Lost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-2xl font-bold">{stats.lost}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={trialStatusFilter}
            onValueChange={setTrialStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Trial Booked">Trial Booked</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Price Negotiation">Price Negotiation</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={dateFilter}
            onValueChange={setDateFilter}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <SelectValue placeholder="Date range" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1_week">Last 1 Week</SelectItem>
              <SelectItem value="2_weeks">Last 2 Weeks</SelectItem>
              <SelectItem value="1_month">Last 1 Month</SelectItem>
              <SelectItem value="3_months">Last 3 Months</SelectItem>
              <SelectItem value="6_months">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content - Card Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : leads && leads.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <LeadCard
                key={lead.lead_id}
                lead={lead}
                onUpdateTrialStatus={handleUpdateTrialStatus}
                onUpdateFollowUp={handleUpdateFollowUp}
                onEdit={setEditingLead}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search || trialStatusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first lead to get started'}
              </p>
              {!search && trialStatusFilter === 'all' && dateFilter === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lead
                </Button>
              )}
            </CardContent>
          </Card>
        )}

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
