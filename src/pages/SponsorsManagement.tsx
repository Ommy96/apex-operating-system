import { useState } from "react";
import { Plus, Search, Edit, Trash2, Mail, Phone, Globe } from "lucide-react";
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

interface Sponsor {
  id: string;
  sponsor_id: string | null;
  name: string;
  country: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface SponsorFormData {
  sponsor_id: string;
  name: string;
  country: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
}

const SponsorsManagement = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState<SponsorFormData>({
    sponsor_id: "",
    name: "",
    country: "",
    email: "",
    phone: "",
    notes: "",
    is_active: true,
  });

  const { data: sponsors, isLoading } = useQuery({
    queryKey: ['sponsors-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Sponsor[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SponsorFormData) => {
      const { error } = await supabase.from('sponsors').insert([{
        sponsor_id: data.sponsor_id || null,
        name: data.name,
        country: data.country || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors-management'] });
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Sponsor created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create sponsor: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SponsorFormData }) => {
      const { error } = await supabase.from('sponsors').update({
        sponsor_id: data.sponsor_id || null,
        name: data.name,
        country: data.country || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        is_active: data.is_active,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors-management'] });
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Sponsor updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update sponsor: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors-management'] });
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Sponsor deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete sponsor: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ sponsor_id: "", name: "", country: "", email: "", phone: "", notes: "", is_active: true });
    setEditingSponsor(null);
    setIsFormOpen(false);
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      sponsor_id: sponsor.sponsor_id || "",
      name: sponsor.name,
      country: sponsor.country || "",
      email: sponsor.email || "",
      phone: sponsor.phone || "",
      notes: sponsor.notes || "",
      is_active: sponsor.is_active,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Sponsor name is required');
      return;
    }
    
    if (editingSponsor) {
      updateMutation.mutate({ id: editingSponsor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredSponsors = sponsors?.filter(sponsor =>
    sponsor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sponsor.sponsor_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sponsor.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sponsor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const activeCount = sponsors?.filter(s => s.is_active).length || 0;
  const inactiveCount = sponsors?.filter(s => !s.is_active).length || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sponsors Management</h1>
          <p className="text-muted-foreground mt-1">Manage all sponsor details</p>
        </div>
        {isAdmin && (
          <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-accent">
                <Plus className="h-4 w-4" />
                Add Sponsor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sponsor_id">Sponsor ID</Label>
                  <Input
                    id="sponsor_id"
                    value={formData.sponsor_id}
                    onChange={(e) => setFormData({ ...formData, sponsor_id: e.target.value })}
                    placeholder="Enter unique sponsor ID (e.g., SPO-001)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Sponsor Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter sponsor name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Enter country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter any notes"
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
                    {editingSponsor ? 'Update' : 'Create'}
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
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-muted-foreground text-xs">Total Sponsors</CardDescription>
            <CardTitle className="text-2xl text-foreground">{sponsors?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-muted-foreground text-xs">Active Sponsors</CardDescription>
            <CardTitle className="text-2xl text-foreground">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-muted-foreground text-xs">Inactive Sponsors</CardDescription>
            <CardTitle className="text-2xl text-foreground">{inactiveCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search sponsors..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sponsors Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredSponsors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No sponsors found
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSponsors.map((sponsor, index) => (
            <Card 
              key={sponsor.id} 
              className={`${getCardStyles((index % 6) as CardVariant)} hover-scale transition-all duration-300`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    {sponsor.sponsor_id && (
                      <Badge variant="outline" className="mb-1 text-xs">{sponsor.sponsor_id}</Badge>
                    )}
                    <CardTitle className="text-base text-foreground">{sponsor.name}</CardTitle>
                  </div>
                  <Badge 
                    variant={sponsor.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {sponsor.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-1.5">
                {sponsor.country && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">{sponsor.country}</span>
                  </div>
                )}
                {sponsor.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm truncate">{sponsor.email}</span>
                  </div>
                )}
                {sponsor.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{sponsor.phone}</span>
                  </div>
                )}
                {sponsor.notes && (
                  <p className="text-muted-foreground/70 text-sm mt-2 line-clamp-2">{sponsor.notes}</p>
                )}
              </CardContent>
              {isAdmin && (
                <CardFooter className="flex justify-end gap-2 border-t border-border p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(sponsor)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-destructive/80 hover:text-destructive-foreground"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this sponsor?')) {
                        deleteMutation.mutate(sponsor.id);
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

export default SponsorsManagement;