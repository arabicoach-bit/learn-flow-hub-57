import { useState, useMemo } from 'react';
import { Download, Users, Loader2 } from 'lucide-react';
import { getCurrentQuarter, getQuarterDateRange, type QuarterFilterValue } from '@/components/shared/QuarterFilter';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useLeads, useUpdateLead, useDeleteLead, type Lead } from '@/hooks/use-leads';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

type TabValue = 'all' | 'pending' | 'trial_booked' | 'price_negotiation' | 'lost';

export default function Leads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilterValue>(getCurrentQuarter);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortBy, setSortBy] = useState<LeadSortOption>('newest');
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const { toast } = useToast();

  const { startDate: filterStart, endDate: filterEnd } = getQuarterDateRange(quarterFilter);

  const { data: leads, isLoading } = useLeads({
    search,
    trial_status: statusFilter === 'all' ? undefined : statusFilter,
    date_start: filterStart,
    date_end: filterEnd,
  });

  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  // Base filtered (before tabs)
  const baseFiltered = useMemo(() => {
    if (!leads) return [];
    let result = [...leads];
    if (followUpFilter !== 'all') {
      result = result.filter(l => l.follow_up === followUpFilter);
    }
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return (a.created_at || '').localeCompare(b.created_at || '');
        case 'alpha_asc': return (a.name || '').localeCompare(b.name || '');
        case 'alpha_desc': return (b.name || '').localeCompare(a.name || '');
        case 'last_contact': return (b.last_contact_date || '').localeCompare(a.last_contact_date || '');
        case 'next_followup': return (a.next_followup_date || '9999').localeCompare(b.next_followup_date || '9999');
        case 'newest': default: return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
  }, [leads, followUpFilter, sortBy]);

  // Tab-filtered list
  const filteredLeads = useMemo(() => {
    if (activeTab === 'all') return baseFiltered;
    if (activeTab === 'pending') return baseFiltered.filter(l => l.trial_status === 'Pending');
    if (activeTab === 'trial_booked') return baseFiltered.filter(l => l.trial_status === 'Trial Booked');
    if (activeTab === 'price_negotiation') return baseFiltered.filter(l => l.trial_status === 'Price Negotiation');
    if (activeTab === 'lost') return baseFiltered.filter(l => l.trial_status === 'Lost');
    return baseFiltered;
  }, [baseFiltered, activeTab]);

  // Stats
  const totalLeads = baseFiltered.length;
  const convertedCount = baseFiltered.filter(l => l.trial_status === 'Trial Booked').length;
  const stats = {
    total: totalLeads,
    pending: baseFiltered.filter(l => l.trial_status === 'Pending').length,
    priceNegotiation: baseFiltered.filter(l => l.trial_status === 'Price Negotiation').length,
    lost: baseFiltered.filter(l => l.trial_status === 'Lost').length,
    converted: convertedCount,
    conversionRate: totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0,
  };

  const tabCounts = {
    all: baseFiltered.length,
    pending: stats.pending,
    trial_booked: convertedCount,
    price_negotiation: stats.priceNegotiation,
    lost: stats.lost,
  };

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

  const handleUpdateLeadStatus = async (leadId: string, trialStatus: string) => {
    try {
      await updateLead.mutateAsync({ leadId, trial_status: trialStatus || undefined });
      toast({ title: 'Lead status updated', description: `Lead marked as ${trialStatus}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update lead status.', variant: 'destructive' });
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


  const handleExport = () => {
    if (!filteredLeads.length) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const exportData: LeadExport[] = filteredLeads.map(l => ({
      name: l.name, phone: l.phone, source: l.source, interest: l.interest,
      first_contact_date: l.first_contact_date,
      last_contact_date: l.last_contact_date, next_followup_date: l.next_followup_date,
      trial_status: l.trial_status,
      follow_up: l.follow_up, notes: l.notes, created_at: l.created_at,
    }));
    exportLeads(exportData);
    toast({ title: 'Exported successfully!' });
  };

  const hasFilters = search || statusFilter !== 'all' || followUpFilter !== 'all';

  const renderContent = (leadsList: Lead[]) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (leadsList.length === 0) {
      return (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {hasFilters ? 'Try adjusting your filters' : 'Add your first lead to get started'}
            </p>
          </CardContent>
        </Card>
      );
    }

    if (viewMode === 'table') {
      return (
        <LeadTableView
          leads={leadsList}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onUpdateFollowUp={handleUpdateFollowUp}
          
          onEdit={setEditingLead}
          onDelete={(leadId) => setDeleteLeadId(leadId)}
          onConvertToTrial={setConvertingLead}
        />
      );
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leadsList.map(lead => (
          <LeadCard
            key={lead.lead_id} lead={lead}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onUpdateFollowUp={handleUpdateFollowUp}
            onEdit={setEditingLead}
            onDelete={(leadId) => setDeleteLeadId(leadId)}
            onConvertToTrial={setConvertingLead}
            onOpenNotes={setNotesLead}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Leads CRM</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" />Export
            </Button>
            <AddLeadForm />
          </div>
        </div>

        {/* Compact Stats */}
        <LeadStatsCards stats={stats} />

        {/* Filters */}
        <LeadFiltersBar
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          followUpFilter={followUpFilter} onFollowUpChange={setFollowUpFilter}
          quarterFilter={quarterFilter} onQuarterChange={setQuarterFilter}
          sortBy={sortBy} onSortChange={setSortBy}
          viewMode={viewMode} onViewModeChange={setViewMode}
        />

        {/* Tabs + Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="bg-muted/50 h-9">
            <TabsTrigger value="all" className="text-xs h-7 px-3">
              All <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{tabCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs h-7 px-3">
              Pending <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-400">{tabCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="trial_booked" className="text-xs h-7 px-3">
              Trial Booked <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-400">{tabCounts.trial_booked}</Badge>
            </TabsTrigger>
            <TabsTrigger value="price_negotiation" className="text-xs h-7 px-3">
              Price Neg. <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-purple-500/20 text-purple-400">{tabCounts.price_negotiation}</Badge>
            </TabsTrigger>
            <TabsTrigger value="lost" className="text-xs h-7 px-3">
              Lost <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400">{tabCounts.lost}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            {renderContent(filteredLeads)}
          </TabsContent>
        </Tabs>

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
        {notesLead && (
          <LeadCommentsDialog
            open={!!notesLead}
            onOpenChange={(open) => !open && setNotesLead(null)}
            leadId={notesLead.lead_id}
            leadName={notesLead.name}
          />
        )}
      </div>
    </AdminLayout>
  );
}
