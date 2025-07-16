import { useState } from "react";
import { Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FamilyAdoptionForm } from "@/components/FamilyAdoptionForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatFamilyAdoptionData } from "@/lib/downloadUtils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function FamilyAdoption() {
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    refetch();
  };

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
              <DialogTitle>Add Family Adoption</DialogTitle>
            </DialogHeader>
            <FamilyAdoptionForm
              onSuccess={handleSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        )}
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
                <Badge variant={family.category === 'Guardian Ration' ? 'default' : 'secondary'}>
                  {family.category}
                </Badge>
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