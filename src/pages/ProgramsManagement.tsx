import { useState } from "react";
import { Plus, Search, Edit, Trash2, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search programs..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Programs</CardTitle>
          <CardDescription>Manage program information</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                        No programs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrograms.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.name}</TableCell>
                        <TableCell>
                          {program.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {program.location}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{program.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={program.is_active ? "default" : "secondary"}>
                            {program.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(program)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this program?')) {
                                    deleteMutation.mutate(program.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramsManagement;
