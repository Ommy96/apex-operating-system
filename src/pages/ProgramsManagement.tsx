import { useState } from "react";
import { Plus, Search, Edit, Trash2, MapPin, Eye, Settings2, Calendar, Users, Target, BookOpen, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { FieldDefinition } from "@/components/ProgramFieldBuilder";
import { useNavigate } from "react-router-dom";
import { ProgramForm, ProgramFormData } from "@/components/programs/ProgramForm";
import { Json } from "@/integrations/supabase/types";
import { PageHeader, StatCard, WorkspacePanel, StatusBadge, getStatusVariant } from "@/components/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Program {
  id: string;
  program_id: string | null;
  name: string;
  location: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  custom_fields: FieldDefinition[] | null;
  show_in_navigation: boolean;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  target_population: string[] | null;
  geographic_coverage: Json | null;
  objectives: string | null;
}

const emptyFormData: ProgramFormData = {
  program_id: "",
  name: "",
  locations: [],
  description: "",
  is_active: true,
  custom_fields: [],
  show_in_navigation: false,
  category: "",
  start_date: "",
  end_date: "",
  status: "planning",
  target_population: [],
  geographic_coverage: "",
  objectives: "",
};

const ProgramsManagement = () => {
  const { isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState<ProgramFormData>(emptyFormData);

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs-management', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .order('name');
      if (error) throw error;
      return data.map(p => ({
        ...p,
        custom_fields: (p.custom_fields as unknown as FieldDefinition[]) || [],
        show_in_navigation: p.show_in_navigation || false,
      })) as Program[];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Real-time: auto-refresh programs
  useRealtimeTable("programs", [["programs-management", currentOrganization?.organization_id || ""], ["programs"], ["dynamic-programs"]], currentOrganization?.organization_id);

  const createMutation = useMutation({
    mutationFn: async (data: ProgramFormData) => {
      if (!currentOrganization?.organization_id) {
        throw new Error('No organization selected');
      }
      const { error } = await supabase.from('programs').insert([{
        program_id: data.program_id || null,
        name: data.name,
        location: data.locations.length > 0 ? data.locations.join(', ') : null,
        description: data.description || null,
        is_active: data.is_active,
        custom_fields: data.custom_fields as unknown as Json[],
        show_in_navigation: data.show_in_navigation,
        organization_id: currentOrganization.organization_id,
        category: data.category || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: data.status || 'planning',
        target_population: data.target_population.length > 0 ? data.target_population : null,
        geographic_coverage: data.geographic_coverage ? { region: data.geographic_coverage } : null,
        objectives: data.objectives || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-management'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-programs'] });
      toast.success('Program created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create program: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProgramFormData }) => {
      const { error } = await supabase.from('programs').update({
        program_id: data.program_id || null,
        name: data.name,
        location: data.locations.length > 0 ? data.locations.join(', ') : null,
        description: data.description || null,
        is_active: data.is_active,
        custom_fields: data.custom_fields as unknown as Json[],
        show_in_navigation: data.show_in_navigation,
        category: data.category || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: data.status || 'planning',
        target_population: data.target_population.length > 0 ? data.target_population : null,
        geographic_coverage: data.geographic_coverage ? { region: data.geographic_coverage } : null,
        objectives: data.objectives || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-management'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-programs'] });
      toast.success('Program updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update program: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-management'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-programs'] });
      toast.success('Program deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete program: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingProgram(null);
    setIsFormOpen(false);
  };

  const extractGeographicCoverage = (geo: Json | null): string => {
    if (!geo) return "";
    if (typeof geo === 'object' && geo !== null && 'region' in geo) {
      return String((geo as { region: unknown }).region);
    }
    if (typeof geo === 'string') return geo;
    return "";
  };

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    const locations = program.location 
      ? program.location.split(',').map(loc => loc.trim()).filter(Boolean)
      : [];
    setFormData({
      program_id: program.program_id || "",
      name: program.name,
      locations,
      description: program.description || "",
      is_active: program.is_active,
      custom_fields: program.custom_fields || [],
      show_in_navigation: program.show_in_navigation,
      category: program.category || "",
      start_date: program.start_date || "",
      end_date: program.end_date || "",
      status: program.status || "planning",
      target_population: program.target_population || [],
      geographic_coverage: extractGeographicCoverage(program.geographic_coverage),
      objectives: program.objectives || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Program name is required');
      return;
    }
    
    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPrograms = programs?.filter(program =>
    program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const activeCount = programs?.filter(p => p.is_active).length || 0;
  const inactiveCount = programs?.filter(p => !p.is_active).length || 0;

  const parseLocations = (location: string | null): string[] => {
    if (!location) return [];
    return location.split(',').map(loc => loc.trim()).filter(Boolean);
  };

  const getCategoryLabel = (category: string | null) => {
    const categories: Record<string, string> = {
      education: "Education",
      health: "Health & Wellness",
      nutrition: "Nutrition & Feeding",
      economic: "Economic Empowerment",
      social: "Social Support",
      shelter: "Shelter & Housing",
      protection: "Child Protection",
      community: "Community Development",
      other: "Other",
    };
    return category ? categories[category] || category : null;
  };

  const getStatusBadge = (status: string | null) => {
    const statusStyles: Record<string, string> = {
      planning: "bg-muted text-muted-foreground",
      active: "bg-success/10 text-success border-success/20",
      on_hold: "bg-warning/10 text-warning border-warning/20",
      completed: "bg-primary/10 text-primary border-primary/20",
      archived: "bg-muted text-muted-foreground",
    };
    const statusLabels: Record<string, string> = {
      planning: "Planning",
      active: "Active",
      on_hold: "On Hold",
      completed: "Completed",
      archived: "Archived",
    };
    return {
      className: statusStyles[status || "planning"] || statusStyles.planning,
      label: statusLabels[status || "planning"] || "Planning",
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs Management"
        description="Create and manage organizational programs with custom data fields"
        icon={BookOpen}
        actions={
          isAdmin ? (
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Program
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4 border-b">
                  <DialogTitle className="text-xl font-semibold">
                    {editingProgram ? 'Edit Program' : 'Create New Program'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProgram 
                      ? 'Update program details and configuration'
                      : 'Set up a new program with custom data collection fields'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                  <ProgramForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    onCancel={resetForm}
                    isEditing={!!editingProgram}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Programs"
          value={programs?.length || 0}
          icon={BookOpen}
          variant="primary"
        />
        <StatCard
          title="Active Programs"
          value={activeCount}
          icon={Target}
          variant="success"
        />
        <StatCard
          title="Inactive Programs"
          value={inactiveCount}
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Search */}
      <WorkspacePanel padding="sm" className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search programs by name, location, or category..."
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </WorkspacePanel>

      {/* Programs Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading programs...</p>
          </div>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No programs found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first program'}
            </p>
            {isAdmin && !searchTerm && (
              <Button onClick={() => setIsFormOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Program
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Target Population</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.map((program) => {
                const locations = parseLocations(program.location);
                const statusBadge = getStatusBadge(program.status);
                const categoryLabel = getCategoryLabel(program.category);
                
                return (
                  <TableRow key={program.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{program.name}</span>
                          {program.show_in_navigation && (
                            <Badge className="text-xs gap-1 bg-primary/80 text-primary-foreground">
                              <Eye className="h-3 w-3" />
                              Nav
                            </Badge>
                          )}
                        </div>
                        {program.program_id && (
                          <span className="text-xs text-muted-foreground font-mono">{program.program_id}</span>
                        )}
                        {program.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{program.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {categoryLabel ? (
                        <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {locations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {locations.slice(0, 2).map((loc) => (
                            <Badge key={loc} variant="secondary" className="text-xs gap-1">
                              <MapPin className="h-3 w-3" />
                              {loc}
                            </Badge>
                          ))}
                          {locations.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{locations.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {program.target_population && program.target_population.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[150px]">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate">{program.target_population.join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {program.custom_fields && program.custom_fields.length > 0 ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Settings2 className="h-3 w-3" />
                          {program.custom_fields.length}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs px-2"
                          onClick={() => navigate(`/programs/dashboard/${program.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-2"
                              onClick={() => handleEdit(program)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-2 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this program?')) {
                                  deleteMutation.mutate(program.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default ProgramsManagement;
