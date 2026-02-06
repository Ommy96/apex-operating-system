import { useState } from "react";
import { Plus, Search, Edit, Trash2, MapPin, Eye, Settings2, Calendar, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { FieldDefinition } from "@/components/ProgramFieldBuilder";
import { useNavigate } from "react-router-dom";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { BookOpen } from "lucide-react";
import { ProgramForm, ProgramFormData } from "@/components/programs/ProgramForm";

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
  target_population: string | null;
  geographic_coverage: string | null;
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
  target_population: "",
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
        custom_fields: data.custom_fields as unknown as Record<string, never>[],
        show_in_navigation: data.show_in_navigation,
        organization_id: currentOrganization.organization_id,
        category: data.category || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: data.status || 'planning',
        target_population: data.target_population || null,
        geographic_coverage: data.geographic_coverage || null,
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
        custom_fields: data.custom_fields as unknown as Record<string, never>[],
        show_in_navigation: data.show_in_navigation,
        category: data.category || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: data.status || 'planning',
        target_population: data.target_population || null,
        geographic_coverage: data.geographic_coverage || null,
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
      target_population: program.target_population || "",
      geographic_coverage: program.geographic_coverage || "",
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
      <PageHeroHeader
        title="Programs Management"
        description="Create and manage organizational programs with custom data fields"
        icon={BookOpen}
        actions={
          isAdmin ? (
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2 shadow-strong">
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
        <Card className={`${getCardStyles(0 as CardVariant)} hover-scale`}>
          <CardHeader className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-muted-foreground text-xs font-medium">Total Programs</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground mt-1">{programs?.length || 0}</CardTitle>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
          <CardHeader className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-muted-foreground text-xs font-medium">Active Programs</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground mt-1">{activeCount}</CardTitle>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
          <CardHeader className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-muted-foreground text-xs font-medium">Inactive Programs</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground mt-1">{inactiveCount}</CardTitle>
              </div>
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search programs by name, location, or category..."
          className="pl-10 h-11"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Programs Cards Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredPrograms.map((program, index) => {
            const locations = parseLocations(program.location);
            const statusBadge = getStatusBadge(program.status);
            const categoryLabel = getCategoryLabel(program.category);
            
            return (
              <Card 
                key={program.id} 
                className={`${getCardStyles((index % 6) as CardVariant)} hover-scale transition-all duration-300 group overflow-hidden`}
              >
                <CardHeader className="py-4 px-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        {program.program_id && (
                          <Badge variant="outline" className="text-xs font-mono">{program.program_id}</Badge>
                        )}
                        {categoryLabel && (
                          <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold text-foreground leading-tight line-clamp-2">
                        {program.name}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant="outline"
                      className={`shrink-0 text-xs ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="py-3 px-5">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {locations.length > 0 && locations.slice(0, 2).map((loc) => (
                      <Badge key={loc} variant="secondary" className="text-xs gap-1">
                        <MapPin className="h-3 w-3" />
                        {loc}
                      </Badge>
                    ))}
                    {locations.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{locations.length - 2} more
                      </Badge>
                    )}
                    {program.custom_fields && program.custom_fields.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Settings2 className="h-3 w-3" />
                        {program.custom_fields.length} fields
                      </Badge>
                    )}
                    {program.show_in_navigation && (
                      <Badge className="text-xs gap-1 bg-primary/80 text-primary-foreground">
                        <Eye className="h-3 w-3" />
                        In Nav
                      </Badge>
                    )}
                  </div>
                  
                  {program.target_population && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Users className="h-3 w-3" />
                      <span className="truncate">{program.target_population}</span>
                    </div>
                  )}
                  
                  {program.description ? (
                    <p className="text-muted-foreground text-xs line-clamp-2">{program.description}</p>
                  ) : (
                    <p className="text-muted-foreground/50 text-xs italic">No description provided</p>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-end gap-1.5 border-t border-border/50 py-3 px-5 bg-muted/30">
                  {program.custom_fields && program.custom_fields.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={() => navigate(`/programs/dynamic/${program.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => handleEdit(program)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-3 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this program?')) {
                            deleteMutation.mutate(program.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgramsManagement;
