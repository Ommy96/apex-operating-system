import { useState } from "react";
import { Plus, Calendar, User, MessageSquare, AlertCircle, CheckCircle, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ObservationFormData {
  observation_date: string;
  observation_category: string;
  narrative_notes: string;
  recommended_action: string;
  follow_up_date: string;
  program_id: string;
  project_id: string;
  status: string;
}

interface ProgramObservationsProps {
  beneficiaryId?: string;
  programId?: string;
  showAddButton?: boolean;
}

const observationCategories = [
  { value: "progress", label: "Progress Update" },
  { value: "concern", label: "Area of Concern" },
  { value: "achievement", label: "Achievement" },
  { value: "health", label: "Health Related" },
  { value: "behavioral", label: "Behavioral" },
  { value: "academic", label: "Academic" },
  { value: "family", label: "Family Situation" },
  { value: "other", label: "Other" },
];

const observationStatuses = [
  { value: "open", label: "Open", color: "bg-warning/10 text-warning" },
  { value: "in_progress", label: "In Progress", color: "bg-primary/10 text-primary" },
  { value: "resolved", label: "Resolved", color: "bg-success/10 text-success" },
  { value: "closed", label: "Closed", color: "bg-muted text-muted-foreground" },
];

const emptyFormData: ObservationFormData = {
  observation_date: new Date().toISOString().split('T')[0],
  observation_category: "",
  narrative_notes: "",
  recommended_action: "",
  follow_up_date: "",
  program_id: "",
  project_id: "",
  status: "open",
};

export const ProgramObservations = ({ beneficiaryId, programId, showAddButton = true }: ProgramObservationsProps) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<ObservationFormData>(emptyFormData);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch programs for dropdown
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

  // Fetch projects for selected program
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

  // Fetch observations
  const { data: observations, isLoading } = useQuery({
    queryKey: ['program-observations', beneficiaryId, programId, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      let query = supabase
        .from('program_observations')
        .select(`
          *,
          programs:program_id (name),
          projects:project_id (name)
        `)
        .eq('organization_id', currentOrganization.organization_id)
        .order('observation_date', { ascending: false });

      if (beneficiaryId) {
        query = query.eq('beneficiary_id', beneficiaryId);
      }
      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ObservationFormData) => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');
      const { error } = await supabase.from('program_observations').insert([{
        organization_id: currentOrganization.organization_id,
        beneficiary_id: beneficiaryId || null,
        program_id: data.program_id || null,
        project_id: data.project_id || null,
        observation_date: data.observation_date,
        observation_category: data.observation_category || null,
        narrative_notes: data.narrative_notes,
        recommended_action: data.recommended_action || null,
        follow_up_date: data.follow_up_date || null,
        status: data.status,
        created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-observations'] });
      toast.success('Observation recorded successfully');
      setFormData(emptyFormData);
      setIsFormOpen(false);
    },
    onError: (error) => toast.error('Failed to save: ' + error.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('program_observations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-observations'] });
      toast.success('Status updated');
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.narrative_notes.trim()) {
      toast.error('Observation notes are required');
      return;
    }
    createMutation.mutate(formData);
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'concern': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'achievement': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'progress': return <Clock className="h-4 w-4 text-primary" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusStyle = (status: string | null) => {
    return observationStatuses.find(s => s.value === status)?.color || observationStatuses[0].color;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Observations & Follow-ups</h3>
          <p className="text-sm text-muted-foreground">
            Track observations and schedule follow-up actions
          </p>
        </div>
        {showAddButton && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Observation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Observation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.observation_date}
                      onChange={(e) => setFormData({ ...formData, observation_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.observation_category}
                      onValueChange={(value) => setFormData({ ...formData, observation_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {observationCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="space-y-2">
                  <Label>Observation Notes *</Label>
                  <Textarea
                    value={formData.narrative_notes}
                    onChange={(e) => setFormData({ ...formData, narrative_notes: e.target.value })}
                    placeholder="Describe your observation..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recommended Action</Label>
                  <Textarea
                    value={formData.recommended_action}
                    onChange={(e) => setFormData({ ...formData, recommended_action: e.target.value })}
                    placeholder="What follow-up action is recommended?"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Follow-up Date</Label>
                    <Input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {observationStatuses.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Saving...' : 'Save Observation'}
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
      ) : observations?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No observations recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {observations?.map((obs) => (
            <Collapsible 
              key={obs.id} 
              open={expandedId === obs.id}
              onOpenChange={(open) => setExpandedId(open ? obs.id : null)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(obs.observation_category)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {observationCategories.find(c => c.value === obs.observation_category)?.label || 'Observation'}
                            </span>
                            <Badge variant="outline" className={`text-xs ${getStatusStyle(obs.status)}`}>
                              {observationStatuses.find(s => s.value === obs.status)?.label || 'Open'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(obs.observation_date), 'MMM d, yyyy')}
                            {obs.programs && (
                              <span className="text-primary">• {(obs.programs as { name: string }).name}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === obs.id ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{obs.narrative_notes}</p>
                    </div>
                    {obs.recommended_action && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Action</p>
                        <p className="text-sm">{obs.recommended_action}</p>
                      </div>
                    )}
                    {obs.follow_up_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-warning" />
                        <span>Follow-up: {format(new Date(obs.follow_up_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Update status:</span>
                      {observationStatuses.map((s) => (
                        <Button
                          key={s.value}
                          variant={obs.status === s.value ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => updateStatusMutation.mutate({ id: obs.id, status: s.value })}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};
