import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, FileText, Eye, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeroHeader } from "@/components/PageHeroHeader";
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

const CustomReports = () => {
  const { isAdmin, isManagement } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("templates");
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [editingEntry, setEditingEntry] = useState<ReportEntry | null>(null);

  // Fetch report templates
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

  // Fetch report entries
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
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
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
    onError: (error) => {
      toast.error('Failed to delete entry: ' + error.message);
    },
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

  const handleEditTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setIsTemplateFormOpen(true);
  };

  const handleNewReport = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setEditingEntry(null);
    setIsEntryFormOpen(true);
  };

  const handleEditEntry = (entry: ReportEntry, template: ReportTemplate) => {
    setSelectedTemplate(template);
    setEditingEntry(entry);
    setIsEntryFormOpen(true);
  };

  const handleExport = (template: ReportTemplate) => {
    const templateEntries = entries?.filter(e => e.template_id === template.id) || [];
    if (templateEntries.length === 0) {
      toast.error('No entries to export');
      return;
    }

    const exportData = templateEntries.map(entry => {
      const row: Record<string, unknown> = {
        'Report Date': entry.report_date,
        'Status': entry.status,
      };
      template.fields.forEach(field => {
        row[field.name] = entry.data[field.name] ?? '';
      });
      row['Created At'] = new Date(entry.created_at).toLocaleDateString();
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, template.name);
    XLSX.writeFile(wb, `${template.name}_reports.xlsx`);
    toast.success('Reports exported successfully');
  };

  const getTemplateName = (templateId: string) => {
    return templates?.find(t => t.id === templateId)?.name || 'Unknown Template';
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-500/10 text-gray-500',
      visit: 'bg-blue-500/10 text-blue-500',
      program: 'bg-green-500/10 text-green-500',
      activity: 'bg-purple-500/10 text-purple-500',
      financial: 'bg-yellow-500/10 text-yellow-500',
      assessment: 'bg-pink-500/10 text-pink-500',
    };
    return colors[category] || colors.general;
  };

  const canManageTemplates = isAdmin || isManagement;

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Custom Reports"
        description="Create and manage custom report templates for your organization"
        icon={FileText}
        actions={
          canManageTemplates && selectedTab === 'templates' ? (
            <Button 
              onClick={() => { setEditingTemplate(null); setIsTemplateFormOpen(true); }}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2 shadow-strong"
            >
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          ) : undefined
        }
      />

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

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="templates">Report Templates</TabsTrigger>
            <TabsTrigger value="entries">Submitted Reports</TabsTrigger>
          </TabsList>

          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => { setEditingTemplate(null); setIsTemplateFormOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover-scale">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge className={getCategoryBadgeColor(template.category)}>
                          {template.category}
                        </Badge>
                      </div>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {template.fields.length} fields
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleNewReport(template)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Report
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport(template)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canManageTemplates && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Delete this template? All associated reports will be deleted.')) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
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
              <CardContent className="py-12 text-center text-muted-foreground">
                No reports submitted yet.
              </CardContent>
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
                          <TableCell className="font-medium">
                            {getTemplateName(entry.template_id)}
                          </TableCell>
                          <TableCell>{entry.report_date}</TableCell>
                          <TableCell>
                            <Badge variant={entry.status === 'submitted' ? 'default' : 'secondary'}>
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {template && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditEntry(entry, template)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm('Delete this report?')) {
                                      deleteEntryMutation.mutate(entry.id);
                                    }
                                  }}
                                >
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
    </div>
  );
};

export default CustomReports;
