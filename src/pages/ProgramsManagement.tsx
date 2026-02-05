import { useState } from "react";
import { Plus, Search, Edit, Trash2, MapPin, X, Eye, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { ProgramFieldBuilder, FieldDefinition } from "@/components/ProgramFieldBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { BookOpen } from "lucide-react";

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
}

interface ProgramFormData {
  program_id: string;
  name: string;
  locations: string[];
  description: string;
  is_active: boolean;
  custom_fields: FieldDefinition[];
  show_in_navigation: boolean;
}

const ProgramsManagement = () => {
  const { isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [formData, setFormData] = useState<ProgramFormData>({
    program_id: "",
    name: "",
    locations: [],
    description: "",
    is_active: true,
    custom_fields: [],
    show_in_navigation: false,
  });

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
    setFormData({ 
      program_id: "", 
      name: "", 
      locations: [], 
      description: "", 
      is_active: true,
      custom_fields: [],
      show_in_navigation: false,
    });
    setLocationInput("");
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
    });
    setLocationInput("");
    setIsFormOpen(true);
  };

  const handleAddLocation = () => {
    const trimmedLocation = locationInput.trim();
    if (trimmedLocation && !formData.locations.includes(trimmedLocation)) {
      setFormData({ ...formData, locations: [...formData.locations, trimmedLocation] });
      setLocationInput("");
    }
  };

  const handleRemoveLocation = (locationToRemove: string) => {
    setFormData({
      ...formData,
      locations: formData.locations.filter(loc => loc !== locationToRemove)
    });
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLocation();
    }
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
    program.location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const activeCount = programs?.filter(p => p.is_active).length || 0;
  const inactiveCount = programs?.filter(p => !p.is_active).length || 0;

  const parseLocations = (location: string | null): string[] => {
    if (!location) return [];
    return location.split(',').map(loc => loc.trim()).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Programs Management"
        description="Manage all program details"
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProgram ? 'Edit Program' : 'Add New Program'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="fields">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Custom Fields
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="program_id">Program ID</Label>
                      <Input
                        id="program_id"
                        value={formData.program_id}
                        onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                        placeholder="Enter unique program ID (e.g., PRG-001)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Program Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter program name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Locations</Label>
                      <div className="flex gap-2">
                        <Input
                          id="location"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          onKeyDown={handleLocationKeyDown}
                          placeholder="Type location and press Enter or Add"
                        />
                        <Button type="button" variant="outline" onClick={handleAddLocation}>
                          Add
                        </Button>
                      </div>
                      {formData.locations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.locations.map((loc) => (
                            <Badge key={loc} variant="secondary" className="gap-1 pr-1">
                              <MapPin className="h-3 w-3" />
                              {loc}
                              <button
                                type="button"
                                onClick={() => handleRemoveLocation(loc)}
                                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter program description"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show_in_navigation"
                        checked={formData.show_in_navigation}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_in_navigation: checked })}
                      />
                      <Label htmlFor="show_in_navigation">Show in Navigation</Label>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="fields" className="mt-4">
                    <ProgramFieldBuilder
                      fields={formData.custom_fields}
                      onChange={(fields) => setFormData({ ...formData, custom_fields: fields })}
                    />
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingProgram ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          ) : undefined
        }
      />

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Total Programs</CardDescription>
            <CardTitle className="text-2xl text-foreground">{programs?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Active Programs</CardDescription>
            <CardTitle className="text-2xl text-foreground">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Inactive Programs</CardDescription>
            <CardTitle className="text-2xl text-foreground">{inactiveCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search programs..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Programs Cards Grid - Compact */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No programs found
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPrograms.map((program, index) => {
            const locations = parseLocations(program.location);
            return (
              <Card 
                key={program.id} 
                className={`${getCardStyles((index % 6) as CardVariant)} hover-scale transition-all duration-300`}
              >
                <CardHeader className="py-3 px-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      {program.program_id && (
                        <Badge variant="outline" className="text-xs">{program.program_id}</Badge>
                      )}
                      <CardTitle className="text-base text-foreground leading-tight">{program.name}</CardTitle>
                    </div>
                    <Badge 
                      variant={program.is_active ? "default" : "secondary"}
                      className="shrink-0 text-xs"
                    >
                      {program.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {locations.length > 0 && locations.map((loc) => (
                      <Badge key={loc} variant="secondary" className="text-xs gap-1">
                        <MapPin className="h-3 w-3" />
                        {loc}
                      </Badge>
                    ))}
                    {program.custom_fields && program.custom_fields.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Settings2 className="h-3 w-3" />
                        {program.custom_fields.length} fields
                      </Badge>
                    )}
                    {program.show_in_navigation && (
                      <Badge variant="default" className="text-xs gap-1 bg-primary/80">
                        <Eye className="h-3 w-3" />
                        In Nav
                      </Badge>
                    )}
                  </div>
                  {program.description ? (
                    <p className="text-muted-foreground text-xs line-clamp-2">{program.description}</p>
                  ) : (
                    <p className="text-muted-foreground/60 text-xs italic">No description</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-1 border-t border-border py-2 px-4">
                  {program.custom_fields && program.custom_fields.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => navigate(`/programs/dynamic/${program.id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => handleEdit(program)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 hover:bg-destructive/80 hover:text-destructive-foreground"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this program?')) {
                            deleteMutation.mutate(program.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
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