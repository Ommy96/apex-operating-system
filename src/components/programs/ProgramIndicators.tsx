import { useState } from "react";
import { Plus, Target, TrendingUp, Edit, Trash2, BarChart3, Percent, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface IndicatorFormData {
  name: string;
  indicator_type: string;
  measurement_unit: string;
  target_value: number | null;
  current_value: number | null;
  program_id: string;
  project_id: string;
  reporting_frequency: string;
  data_collection_method: string;
  is_active: boolean;
}

interface ProgramIndicatorsProps {
  programId?: string;
  projectId?: string;
  showAddButton?: boolean;
}

const indicatorTypes = [
  { value: "output", label: "Output", description: "Direct deliverables" },
  { value: "outcome", label: "Outcome", description: "Short-term changes" },
  { value: "impact", label: "Impact", description: "Long-term effects" },
];

const measurementUnits = [
  { value: "number", label: "Number", icon: Hash },
  { value: "percentage", label: "Percentage", icon: Percent },
  { value: "currency", label: "Currency (KSH)", icon: BarChart3 },
  { value: "ratio", label: "Ratio", icon: TrendingUp },
];

const reportingFrequencies = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const emptyFormData: IndicatorFormData = {
  name: "",
  indicator_type: "output",
  measurement_unit: "number",
  target_value: null,
  current_value: null,
  program_id: "",
  project_id: "",
  reporting_frequency: "monthly",
  data_collection_method: "",
  is_active: true,
};

export const ProgramIndicators = ({ programId, projectId, showAddButton = true }: ProgramIndicatorsProps) => {
  const { currentOrganization } = useOrganization();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<IndicatorFormData>({
    ...emptyFormData,
    program_id: programId || "",
  });

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs-dropdown', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects-dropdown', formData.program_id],
    queryFn: async () => {
      if (!formData.program_id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('program_id', formData.program_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!formData.program_id,
  });

  // Fetch indicators
  const { data: indicators, isLoading } = useQuery({
    queryKey: ['program-indicators', programId, projectId, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      let query = supabase
        .from('program_indicators')
        .select(`
          *,
          programs:program_id (name),
          projects:project_id (name)
        `)
        .eq('organization_id', currentOrganization.organization_id)
        .order('name');

      if (programId) {
        query = query.eq('program_id', programId);
      }
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: IndicatorFormData) => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');
      
      const payload = {
        organization_id: currentOrganization.organization_id,
        name: data.name,
        indicator_type: data.indicator_type,
        measurement_unit: data.measurement_unit,
        target_value: data.target_value,
        current_value: data.current_value,
        program_id: data.program_id || null,
        project_id: data.project_id || null,
        reporting_frequency: data.reporting_frequency,
        data_collection_method: data.data_collection_method || null,
        is_active: data.is_active,
        created_by: user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from('program_indicators')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('program_indicators')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-indicators'] });
      toast.success(editingId ? 'Indicator updated' : 'Indicator created');
      resetForm();
    },
    onError: (error) => toast.error('Failed to save: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('program_indicators')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-indicators'] });
      toast.success('Indicator deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const updateValueMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from('program_indicators')
        .update({ current_value: value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-indicators'] });
      toast.success('Value updated');
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const resetForm = () => {
    setFormData({ ...emptyFormData, program_id: programId || "" });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (indicator: typeof indicators extends (infer T)[] ? T : never) => {
    setFormData({
      name: indicator.name,
      indicator_type: indicator.indicator_type || "output",
      measurement_unit: indicator.measurement_unit || "number",
      target_value: indicator.target_value,
      current_value: indicator.current_value,
      program_id: indicator.program_id || "",
      project_id: indicator.project_id || "",
      reporting_frequency: indicator.reporting_frequency || "monthly",
      data_collection_method: indicator.data_collection_method || "",
      is_active: indicator.is_active ?? true,
    });
    setEditingId(indicator.id);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Indicator name is required');
      return;
    }
    saveMutation.mutate(formData);
  };

  const calculateProgress = (current: number | null, target: number | null) => {
    if (!target || target === 0) return 0;
    return Math.min(Math.round(((current || 0) / target) * 100), 100);
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'output': return 'bg-primary/10 text-primary';
      case 'outcome': return 'bg-warning/10 text-warning';
      case 'impact': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Program Indicators</h3>
          <p className="text-sm text-muted-foreground">
            Track performance metrics and targets
          </p>
        </div>
        {showAddButton && isAdmin && (
          <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Indicator
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Indicator' : 'Create Indicator'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Indicator Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Number of children enrolled"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.indicator_type}
                      onValueChange={(value) => setFormData({ ...formData, indicator_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {indicatorTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <div>
                              <div>{t.label}</div>
                              <div className="text-xs text-muted-foreground">{t.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={formData.measurement_unit}
                      onValueChange={(value) => setFormData({ ...formData, measurement_unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {measurementUnits.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      value={formData.target_value ?? ''}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Value</Label>
                    <Input
                      type="number"
                      value={formData.current_value ?? ''}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Program</Label>
                    <Select
                      value={formData.program_id}
                      onValueChange={(value) => setFormData({ ...formData, program_id: value, project_id: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                      disabled={!formData.program_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reporting Frequency</Label>
                    <Select
                      value={formData.reporting_frequency}
                      onValueChange={(value) => setFormData({ ...formData, reporting_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reportingFrequencies.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Collection Method</Label>
                    <Input
                      value={formData.data_collection_method}
                      onChange={(e) => setFormData({ ...formData, data_collection_method: e.target.value })}
                      placeholder="e.g., Survey, Records"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : indicators?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No indicators defined yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indicators?.map((indicator) => {
            const progress = calculateProgress(indicator.current_value, indicator.target_value);
            return (
              <Card key={indicator.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getTypeColor(indicator.indicator_type)}`}>
                          {indicatorTypes.find(t => t.value === indicator.indicator_type)?.label || 'Output'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {reportingFrequencies.find(f => f.value === indicator.reporting_frequency)?.label || 'Monthly'}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{indicator.name}</CardTitle>
                      {indicator.programs && (
                        <CardDescription className="text-xs">
                          {(indicator.programs as { name: string }).name}
                          {indicator.projects && ` → ${(indicator.projects as { name: string }).name}`}
                        </CardDescription>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(indicator)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Delete this indicator?')) {
                              deleteMutation.mutate(indicator.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {indicator.current_value ?? 0} / {indicator.target_value ?? '-'} 
                      {indicator.measurement_unit === 'percentage' ? '%' : ''}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{progress}% achieved</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="h-8 w-24 text-sm"
                        placeholder="Update"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = Number((e.target as HTMLInputElement).value);
                            if (!isNaN(value)) {
                              updateValueMutation.mutate({ id: indicator.id, value });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <TrendingUp className={`h-4 w-4 ${progress >= 100 ? 'text-success' : progress >= 50 ? 'text-warning' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
