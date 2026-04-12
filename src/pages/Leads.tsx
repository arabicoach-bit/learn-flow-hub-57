import { useState, useMemo } from 'react';
import { Download, Users, Plus, Loader2 } from 'lucide-react';
import { getCurrentQuarter, getQuarterDateRange, type QuarterFilterValue } from '@/components/shared/QuarterFilter';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useLeads, useUpdateLead, useDeleteLead, type Lead } from '@/hooks/use-leads';
import { useLeadCommentsCounts } from '@/hooks/use-lead-comments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { EditLeadDialog } from '@/components/leads/EditLeadDialog';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadTableView } from '@/components/leads/LeadTableView';
import { LeadStatsCards } from '@/components/leads/LeadStatsCards';
import { LeadFiltersBar } from '@/components/leads/LeadFiltersBar';
import { type LeadSortOption } from '@/components/leads/LeadFiltersBar';
import { AddLeadForm } from '@/components/leads/AddLeadForm';
import { ConvertLeadToTrialDialog } from '@/components/leads/ConvertLeadToTrialDialog';
import { LeadCommentsDialog } from '@/components/leads/LeadCommentsDialog';
import { exportLeads, type LeadExport } from '@/lib/excel-export';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';

export default function Leads() {
  const [search, setSearch] = useState('');
  const [trialStatusFilter, setTrialStatusFilter] = useState('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilterValue>(getCurrentQuarter);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<LeadSortOption>('newest');
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  const { startDate: filterStart, endDate: filterEnd } = getQuarterDateRange(quarterFilter);

  const { data: leads, isLoading } = useLeads({
    search,
    trial_status: trialStatusFilter === 'all' ? undefined : trialStatusFilter,
    date_start: filterStart,
    date_end: filterEnd,
  });

  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const leadIds = useMemo(() => leads?.map(l => l.lead_id) || [], [leads]);
  const { data: commentCounts } = useLeadCommentsCounts(leadIds);

  // Client-side filters for lead status and follow-up
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;
    if (leadStatusFilter !== 'all') {
      result = result.filter(l => l.status === leadStatusFilter);
    }
    if (followUpFilter !== 'all') {
      result = result.filter(l => l.follow_up === followUpFilter);
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return (a.created_at || '').localeCompare(b.created_at || '');
        case 'alpha_asc': return (a.name || '').localeCompare(b.name || '');
        case 'alpha_desc': return (b.name || '').localeCompare(a.name || '');
        case 'last_contact': return (b.last_contact_date || '').localeCompare(a.last_contact_date || '');
        case 'next_followup': return (a.next_followup_date || '9999').localeCompare(b.next_followup_date || '9999');
        case 'newest': default: return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
  }, [leads, leadStatusFilter, followUpFilter, sortBy]);

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    try {
      await deleteLead.mutateAsync(deleteLeadId);
      toast({ title: 'Deleted', description: 'Lead deleted successfully.' });
      setDeleteLeadId(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete lead.', variant: 'destructive' });
    }
  };

  const deleteLeadName = leads?.find(l => l.lead_id === deleteLeadId)?.name;

  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      await updateLead.mutateAsync({ leadId, status: status as Lead['status'] });
      toast({ title: 'Lead status updated', description: `Lead marked as ${status}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update lead status.', variant: 'destructive' });
    }
  };

  const handleUpdateTrialStatus = async (leadId: string, trialStatus: string) => {
    try {
      await updateLead.mutateAsync({ leadId, trial_status: trialStatus || undefined });
      toast({ title: 'Trial status updated', description: trialStatus ? `Lead marked as ${trialStatus}.` : 'Trial status cleared.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update trial status.', variant: 'destructive' });
    }
  };

  const handleUpdateFollowUp = async (leadId: string, followUp: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateLead.mutateAsync({ 
        leadId, 
        follow_up: followUp || undefined,
        last_contact_date: followUp ? today : undefined,
      });
      toast({ title: 'Follow-up updated', description: followUp ? `Follow-up set to ${followUp}.` : 'Follow-up cleared.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update follow-up.', variant: 'destructive' });
    }
  };
  const handleUpdateHandledBy = async (leadId: string, handledBy: string) => {
    try {
      await updateLead.mutateAsync({ leadId, handled_by: handledBy || undefined });
      toast({ title: 'Updated', description: handledBy ? `Handled by set to ${handledBy}.` : 'Handled by cleared.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
    }
  };

  const totalLeads = filteredLeads.length;
  // "Trial Booked" = converted in the lead pipeline
  const convertedCount = filteredLeads.filter(l => l.trial_status === 'Trial Booked' || l.status === 'Converted').length;
  const stats = {
    total: totalLeads,
    pending: filteredLeads.filter(l => l.trial_status === 'Pending').length,
    priceNegotiation: filteredLeads.filter(l => l.trial_status === 'Price Negotiation').length,
    lost: filteredLeads.filter(l => l.trial_status === 'Lost').length,
    converted: convertedCount,
    conversionRate: totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0,
  };

  const hasFilters = search || trialStatusFilter !== 'all' || leadStatusFilter !== 'all' || followUpFilter !== 'all';

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
                if (!filteredLeads.length) {
                  toast({ title: 'No data to export', variant: 'destructive' });
                  return;
                }
                const exportData: LeadExport[] = filteredLeads.map(l => ({
                  name: l.name, phone: l.phone, source: l.source, interest: l.interest,
                  status: l.status, first_contact_date: l.first_contact_date,
                  last_contact_date: l.last_contact_date, next_followup_date: l.next_followup_date,
                  handled_by: l.handled_by, trial_status: l.trial_status,
                  follow_up: l.follow_up, notes: l.notes, created_at: l.created_at,
                }));
                exportLeads(exportData);
                toast({ title: 'Exported successfully!' });
              }}
            >
              <Download className="w-4 h-4 mr-2" />Export Excel
            </Button>
            <AddLeadForm />
          </div>
        </div>

        {/* Stats */}
        <LeadStatsCards stats={stats} />

        {/* Filters */}
        <LeadFiltersBar
          search={search} onSearchChange={setSearch}
          trialStatusFilter={trialStatusFilter} onTrialStatusChange={setTrialStatusFilter}
          leadStatusFilter={leadStatusFilter} onLeadStatusChange={setLeadStatusFilter}
          followUpFilter={followUpFilter} onFollowUpChange={setFollowUpFilter}
          quarterFilter={quarterFilter} onQuarterChange={setQuarterFilter}
          sortBy={sortBy} onSortChange={setSortBy}
          viewMode={viewMode} onViewModeChange={setViewMode}
        />

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredLeads.length > 0 ? (
          viewMode === 'cards' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map(lead => (
                <LeadCard
                  key={lead.lead_id} lead={lead}
                  onUpdateTrialStatus={handleUpdateTrialStatus}
                  onUpdateFollowUp={handleUpdateFollowUp}
                  onEdit={setEditingLead}
                  onDelete={(leadId) => setDeleteLeadId(leadId)}
                  onConvertToTrial={setConvertingLead}
                />
              ))}
            </div>
          ) : (
            <LeadTableView
              leads={filteredLeads}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onUpdateTrialStatus={handleUpdateTrialStatus}
              onUpdateFollowUp={handleUpdateFollowUp}
              onUpdateHandledBy={handleUpdateHandledBy}
              onEdit={setEditingLead}
              onDelete={(leadId) => setDeleteLeadId(leadId)}
              onConvertToTrial={setConvertingLead}
            />
          )
        ) : (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {hasFilters ? 'Try adjusting your filters' : 'Add your first lead to get started'}
              </p>
            </CardContent>
          </Card>
        )}

        <EditLeadDialog
          lead={editingLead} open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
        />
        <ConvertLeadToTrialDialog
          lead={convertingLead} open={!!convertingLead}
          onOpenChange={(open) => !open && setConvertingLead(null)}
        />
        <DeleteConfirmDialog
          open={!!deleteLeadId}
          onOpenChange={(open) => !open && setDeleteLeadId(null)}
          onConfirm={handleDeleteLead}
          title="Delete Lead"
          entityName={deleteLeadName}
          description="This will permanently remove this lead and all associated data."
        />
      </div>
    </AdminLayout>
  );
}
