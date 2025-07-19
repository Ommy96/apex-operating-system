import { useState } from "react";
import { Plus, Search, Download, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FamilyAdoptionForm } from "@/components/FamilyAdoptionForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatFamilyAdoptionData } from "@/lib/downloadUtils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function FamilyAdoption() {
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [residenceFilter, setResidenceFilter] = useState("");

  const { data: familyAdoptions, refetch } = useQuery({
    queryKey: ['family-adoption'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_adoption')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredFamilies = familyAdoptions?.filter(family => {
    const matchesSearch = family.known_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || family.category === categoryFilter;
    const matchesResidence = !residenceFilter || residenceFilter === 'all' || family.residence === residenceFilter;
    
    return matchesSearch && matchesCategory && matchesResidence;
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingFamily(null);
    refetch();
  };

  const handleEdit = (family: any) => {
    setEditingFamily(family);
    setIsDialogOpen(true);
  };

  const handleDelete = async (familyId: string) => {
    try {
      const { error } = await supabase
        .from('family_adoption')
        .delete()
        .eq('id', familyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Family adoption record deleted successfully",
      });
      refetch();
    } catch (error) {
      console.error('Error deleting family adoption:', error);
      toast({
        title: "Error",
        description: "Failed to delete family adoption record",
        variant: "destructive",
      });
    }
  };

  // Statistics calculations
  const totalFamilies = familyAdoptions?.length || 0;
  const maleCount = familyAdoptions?.filter(f => f.gender === 'Male').length || 0;
  const femaleCount = familyAdoptions?.filter(f => f.gender === 'Female').length || 0;
  
  const residenceStats = familyAdoptions?.reduce((acc: any, family) => {
    const residence = family.residence || 'Unknown';
    acc[residence] = (acc[residence] || 0) + 1;
    return acc;
  }, {}) || {};

  const categoryStats = familyAdoptions?.reduce((acc: any, family) => {
    const category = family.category || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {}) || {};

  const handleDownload = () => {
    if (!familyAdoptions || familyAdoptions.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no family adoption records to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatFamilyAdoptionData(familyAdoptions);
    downloadExcel(formattedData, 'family_adoption_records', 'Family Adoption Records');
    
    toast({
      title: "Download started",
      description: "Your family adoption records are being downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Family Adoption</h1>
          <p className="text-muted-foreground">Support families through adoption programs</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Family
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFamily ? 'Edit Family Adoption' : 'Add Family Adoption'}</DialogTitle>
            </DialogHeader>
            <FamilyAdoptionForm
              family={editingFamily}
              onSuccess={handleSuccess}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingFamily(null);
              }}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFamilies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Male</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maleCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Female</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{femaleCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guardian Ration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats['Guardian Ration'] || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Residence Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(residenceStats).map(([residence, count]) => (
          <Card key={residence}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{residence}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count as number}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by known name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Guardian Ration">Guardian Ration</SelectItem>
            <SelectItem value="Home Based Care">Home Based Care</SelectItem>
          </SelectContent>
        </Select>

        <Select value={residenceFilter} onValueChange={setResidenceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by residence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Residences</SelectItem>
            <SelectItem value="Kibera">Kibera</SelectItem>
            <SelectItem value="Kawangware">Kawangware</SelectItem>
            <SelectItem value="Diaspora">Diaspora</SelectItem>
            <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
          </SelectContent>
        </Select>
        
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFamilies?.map((family) => (
          <Card key={family.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{family.known_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={family.category === 'Guardian Ration' ? 'default' : 'secondary'}>
                    {family.category}
                  </Badge>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(family)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Family Record</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {family.known_name}'s record? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(family.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {family.actual_name && (
                <div className="text-sm text-muted-foreground">
                  <strong>Actual Name:</strong> {family.actual_name}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <strong>Gender:</strong> {family.gender || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Residence:</strong> {family.residence || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Beneficiaries:</strong> {family.no_of_beneficiaries || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Sponsor:</strong> {family.sponsor || 'Not specified'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFamilies?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No family adoption records found.</p>
        </div>
      )}
    </div>
  );
}