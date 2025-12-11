import { useState } from "react";
import { Plus, Search, Edit, Trash2, MapPin, FileText } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";

interface Program {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProgramFormData {
  name: string;
  location: string;
  description: string;
  is_active: boolean;
}

const ProgramsManagement = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState<ProgramFormData>({
    name: "",
    location: "",
    description: "",
    is_active: true,
  });

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Program[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProgramFormData) => {
      const { error } = await supabase.from('programs').insert([{
        name: data.name,
        location: data.location || null,
        description: data.description || null,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-management'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
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
        name: data.name,
        location: data.location || null,
        description: data.description || null,
        is_active: data.is_active,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-management'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
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
      toast.success('Program deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete program: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", location: "", description: "", is_active: true });
    setEditingProgram(null);
    setIsFormOpen(false);
  };

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      location: program.location || "",
      description: program.description || "",
      is_active: program.is_active,
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
    program.location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const activeCount = programs?.filter(p => p.is_active).length || 0;
  const inactiveCount = programs?.filter(p => !p.is_active).length || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Programs Management</h1>
          <p className="text-muted-foreground mt-1">Manage all program details</p>
        </div>
        {isAdmin && (
          <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProgram ? 'Edit Program' : 'Add New Program'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter location"
                  />
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingProgram ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`${getCardStyles(0 as CardVariant)} hover-scale`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-white/80">Total Programs</CardDescription>
            <CardTitle className="text-3xl text-white">{programs?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-white/80">Active Programs</CardDescription>
            <CardTitle className="text-3xl text-white">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-white/80">Inactive Programs</CardDescription>
            <CardTitle className="text-3xl text-white">{inactiveCount}</CardTitle>
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

      {/* Programs Cards Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program, index) => (
            <Card 
              key={program.id} 
              className={`${getCardStyles((index % 6) as CardVariant)} hover-scale transition-all duration-300`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl text-white">{program.name}</CardTitle>
                    {program.location && (
                      <div className="flex items-center gap-1 text-white/80">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{program.location}</span>
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant={program.is_active ? "default" : "secondary"}
                    className={program.is_active ? "bg-white/20 text-white border-white/30" : ""}
                  >
                    {program.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {program.description ? (
                  <p className="text-white/80 text-sm line-clamp-3">{program.description}</p>
                ) : (
                  <p className="text-white/60 text-sm italic">No description</p>
                )}
              </CardContent>
              {isAdmin && (
                <CardFooter className="flex justify-end gap-2 border-t border-white/20 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleEdit(program)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-destructive/80 hover:text-white"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this program?')) {
                        deleteMutation.mutate(program.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramsManagement;