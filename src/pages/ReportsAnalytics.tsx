import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, GraduationCap, Users, Home, Target,
  Activity, Shield, Gauge, DollarSign, HeartPulse, ShieldAlert, TrendingUp,
  FileText, Plus, Search, Edit, Trash2, Eye, Download,
} from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

// Analytics sections
import { AnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import { AcademicPerformanceSection } from "@/components/analytics/AcademicPerformanceSection";
import { FieldActivitySection } from "@/components/analytics/FieldActivitySection";
import { SystemIntelligenceSection } from "@/components/analytics/SystemIntelligenceSection";
import { DataAnalysisSection } from "@/components/analytics/DataAnalysisSection";

// Executive components
import { ExecutiveSummaryPanel } from "@/components/executive/ExecutiveSummaryPanel";
import { StaffPerformanceIntelligence } from "@/components/executive/StaffPerformanceIntelligence";
import { ProgramProjectIntelligence } from "@/components/executive/ProgramProjectIntelligence";
import { BeneficiaryImpactIntelligence } from "@/components/executive/BeneficiaryImpactIntelligence";
import { DonorFundingIntelligence } from "@/components/executive/DonorFundingIntelligence";
import { OrgHealthScore } from "@/components/executive/OrgHealthScore";
import { RiskDashboard } from "@/components/executive/RiskDashboard";
import { ForecastingEngine } from "@/components/executive/ForecastingEngine";
import { useExecutiveAnalytics } from "@/hooks/useExecutiveAnalytics";

// Custom Reports components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { ReportTemplateForm } from "@/components/ReportTemplateForm";
import { ReportEntryForm } from "@/components/ReportEntryForm";
import { FieldDefinition } from "@/components/ProgramFieldBuilder";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import * as XLSX from "xlsx";

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  fields: FieldDefinition[];
  header_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

interface ReportEntry {
  id: string;
  template_id: string;
  data: Record<string, unknown>;
  report_date: string;
  status: string;
  created_at: string;
  submitted_by: string | null;
}

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState("health");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  });
  const [programFilter, setProgramFilter] = useState("all");
  const { isAdmin, isManagement } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const {
    beneficiaries, programs, enrollments, visitations,
    academicRecords, uploads, donors,
    staffMetrics, executiveSummary, monthlyStaffTrends, hrAlerts,
    programIntelligence, beneficiaryImpact, donorIntelligence,
    isLoading,
  } = useExecutiveAnalytics(dateRange, programFilter);

  // === Custom Reports State ===
  const [searchTerm, setSearchTerm] = useState("");
  const [reportsSubTab, setReportsSubTab] = useState("templates");
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [editingEntry, setEditingEntry] = useState<ReportEntry | null>(null);

  // Custom Reports queries
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['report-templates', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .order('name');
      if (error) throw error;
      return data.map(t => ({
        ...t,
        fields: (t.fields as unknown as FieldDefinition[]) || [],
        header_config: (t.header_config as Record<string, unknown>) || {},
      })) as ReportTemplate[];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['report-entries', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('report_entries')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReportEntry[];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('report_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Report template deleted');
    },
    onError: (error) => toast.error('Failed to delete template: ' + error.message),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('report_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-entries'] });
      toast.success('Report entry deleted');
    },
    onError: (error) => toast.error('Failed to delete entry: ' + error.message),
  });

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchTerm) return templates;
    return templates.filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const filteredEntries = useMemo(() => {
    if (!entries || !templates) return [];
    if (!searchTerm) return entries;
    return entries.filter(e => {
      const template = templates.find(t => t.id === e.template_id);
      return template?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(e.data).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [entries, templates, searchTerm]);

  const handleExport = (template: ReportTemplate) => {
    const templateEntries = entries?.filter(e => e.template_id === template.id) || [];
    if (templateEntries.length === 0) { toast.error('No entries to export'); return; }
    const exportData = templateEntries.map(entry => {
      const row: Record<string, unknown> = { 'Report Date': entry.report_date, 'Status': entry.status };
      template.fields.forEach(field => { row[field.name] = entry.data[field.name] ?? ''; });
      row['Created At'] = new Date(entry.created_at).toLocaleDateString();
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, template.name);
    XLSX.writeFile(wb, `${template.name}_reports.xlsx`);
    toast.success('Reports exported successfully');
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-500/10 text-gray-500', visit: 'bg-blue-500/10 text-blue-500',
      program: 'bg-green-500/10 text-green-500', activity: 'bg-purple-500/10 text-purple-500',
      financial: 'bg-yellow-500/10 text-yellow-500', assessment: 'bg-pink-500/10 text-pink-500',
    };
    return colors[category] || colors.general;
  };

  const canManageTemplates = isAdmin || isManagement;

  const tabs = [
    { id: 'health', label: 'Health Score', icon: HeartPulse },
    { id: 'risks', label: 'Risk Dashboard', icon: ShieldAlert },
    { id: 'forecast', label: 'Forecasting', icon: TrendingUp },
    { id: 'staff', label: 'Staff & HR', icon: Activity },
    { id: 'programs', label: 'Programs', icon: Target },
    { id: 'lifecycle', label: 'Beneficiary Impact', icon: Users },
    { id: 'donors', label: 'Donor & Funding', icon: DollarSign },
    { id: 'field', label: 'Visitations', icon: Home },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'analysis', label: 'Data Analysis', icon: Search },
    { id: 'system', label: 'Data Quality', icon: Shield },
    { id: 'custom', label: 'Custom Reports', icon: FileText },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeroHeader
        icon={BarChart3}
        title="Analytics & Reporting Center"
        description="Executive intelligence, analytics, and custom reporting in one unified hub"
      />

      <ExecutiveSummaryPanel summary={executiveSummary} isLoading={isLoading} />

      <AnalyticsDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        programs={programs}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto md:flex-wrap h-auto gap-1 p-1 bg-muted/50">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-1.5 whitespace-nowrap text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="health">
          <OrgHealthScore
            summary={executiveSummary}
            staffMetrics={staffMetrics}
            beneficiaryImpact={beneficiaryImpact}
            donorIntelligence={donorIntelligence}
            programIntelligence={programIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="risks">
          <RiskDashboard
            summary={executiveSummary}
            staffMetrics={staffMetrics}
            hrAlerts={hrAlerts}
            beneficiaryImpact={beneficiaryImpact}
            donorIntelligence={donorIntelligence}
            programIntelligence={programIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="forecast">
          <ForecastingEngine
            programIntelligence={programIntelligence}
            donorIntelligence={donorIntelligence}
            monthlyStaffTrends={monthlyStaffTrends}
            summary={executiveSummary}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="staff">
          <StaffPerformanceIntelligence
            staffMetrics={staffMetrics}
            monthlyTrends={monthlyStaffTrends}
            hrAlerts={hrAlerts}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramProjectIntelligence
            data={programIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="lifecycle">
          <BeneficiaryImpactIntelligence
            data={beneficiaryImpact}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="donors">
          <DonorFundingIntelligence
            data={donorIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="field">
          <FieldActivitySection 
            visitations={visitations}
            beneficiaries={beneficiaries}
            dateRange={dateRange}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="academic">
          <AcademicPerformanceSection 
            academicRecords={academicRecords}
            beneficiaries={beneficiaries}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="analysis">
          <DataAnalysisSection
            beneficiaries={beneficiaries}
            donors={donors}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="system">
          <SystemIntelligenceSection 
            beneficiaries={beneficiaries}
            enrollments={enrollments}
            programs={programs}
            reportsData={null}
            uploads={uploads}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="custom">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className={`${getCardStyles(0 as CardVariant)} hover-scale`}>
                <CardHeader className="py-3 px-4">
                  <CardDescription className="text-muted-foreground text-xs">Total Templates</CardDescription>
                  <CardTitle className="text-2xl text-foreground">{templates?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
                <CardHeader className="py-3 px-4">
                  <CardDescription className="text-muted-foreground text-xs">Active Templates</CardDescription>
                  <CardTitle className="text-2xl text-foreground">
                    {templates?.filter(t => t.is_active).length || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
                <CardHeader className="py-3 px-4">
                  <CardDescription className="text-muted-foreground text-xs">Total Reports</CardDescription>
                  <CardTitle className="text-2xl text-foreground">{entries?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className={`${getCardStyles(3 as CardVariant)} hover-scale`}>
                <CardHeader className="py-3 px-4">
                  <CardDescription className="text-muted-foreground text-xs">Submitted</CardDescription>
                  <CardTitle className="text-2xl text-foreground">
                    {entries?.filter(e => e.status === 'submitted').length || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Tabs value={reportsSubTab} onValueChange={setReportsSubTab}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="overflow-x-auto w-full sm:w-auto">
                  <TabsList className="inline-flex w-max sm:w-auto">
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="entries">Submitted</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {canManageTemplates && reportsSubTab === 'templates' && (
                    <Button 
                      onClick={() => { setEditingTemplate(null); setIsTemplateFormOpen(true); }}
                      className="gap-2"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Template</span>
                    </Button>
                  )}
                </div>
              </div>

              <TabsContent value="templates" className="mt-4">
                {templatesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No report templates found.</p>
                      {canManageTemplates && (
                        <Button variant="outline" className="mt-4" onClick={() => { setEditingTemplate(null); setIsTemplateFormOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Template
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTemplates.map((template, index) => (
                      <Card key={template.id} className={`${getCardStyles((index % 6) as CardVariant)} hover-scale overflow-hidden`}>
                        <CardHeader className="pb-2 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                                <FileText className="h-5 w-5 text-foreground" />
                              </div>
                              <div className="min-w-0">
                                <CardTitle className="text-base font-semibold truncate text-foreground">{template.name}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">{template.fields.length} field{template.fields.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <Badge variant={template.is_active ? 'default' : 'secondary'} className="shrink-0 text-xs">
                              {template.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <Badge className={`${getCategoryBadgeColor(template.category)} w-fit text-xs`}>{template.category}</Badge>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{template.description || 'No description provided'}</p>
                          <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2" onClick={() => { setSelectedTemplate(template); setEditingEntry(null); setIsEntryFormOpen(true); }}>
                            <Plus className="h-4 w-4" />
                            Submit New Report
                          </Button>
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <Button size="sm" variant="ghost" className="text-xs gap-1.5 h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => handleExport(template)}>
                              <Download className="h-3.5 w-3.5" />Export
                            </Button>
                            {canManageTemplates && (
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditingTemplate(template); setIsTemplateFormOpen(true); }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => { if (confirm('Delete this template?')) deleteTemplateMutation.mutate(template.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="entries" className="mt-4">
                {entriesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">No reports submitted yet.</CardContent>
                  </Card>
                ) : (
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Template</TableHead>
                            <TableHead>Report Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEntries.map((entry) => {
                            const template = templates?.find(t => t.id === entry.template_id);
                            return (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">{templates?.find(t => t.id === entry.template_id)?.name || 'Unknown'}</TableCell>
                                <TableCell>{entry.report_date}</TableCell>
                                <TableCell><Badge variant={entry.status === 'submitted' ? 'default' : 'secondary'}>{entry.status}</Badge></TableCell>
                                <TableCell className="text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    {template && (
                                      <Button variant="ghost" size="sm" onClick={() => { setSelectedTemplate(template); setEditingEntry(entry); setIsEntryFormOpen(true); }}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {isAdmin && (
                                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => { if (confirm('Delete this report?')) deleteEntryMutation.mutate(entry.id); }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Template Form Modal */}
          <ReportTemplateForm
            isOpen={isTemplateFormOpen}
            onClose={() => { setIsTemplateFormOpen(false); setEditingTemplate(null); }}
            editingTemplate={editingTemplate}
          />

          {/* Entry Form Modal */}
          {selectedTemplate && (
            <ReportEntryForm
              isOpen={isEntryFormOpen}
              onClose={() => { setIsEntryFormOpen(false); setSelectedTemplate(null); setEditingEntry(null); }}
              template={selectedTemplate}
              editingEntry={editingEntry}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
