import { useState, useMemo } from "react";
import { Plus, Search, Download, Edit, Trash2, Eye, Users, User, MapPin, Activity, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FamilyAdoptionForm } from "@/components/FamilyAdoptionForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatFamilyAdoptionData } from "@/lib/downloadUtils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCardStyles, type CardVariant } from "@/lib/cardStyles";

export default function FamilyAdoption() {
  const { isAdmin, isManagement } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<any>(null);
  const [viewingFamily, setViewingFamily] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [residenceFilter, setResidenceFilter] = useState("");
  const [familyStatusFilter, setFamilyStatusFilter] = useState("");
  const [sourceOfIncomeFilter, setSourceOfIncomeFilter] = useState("");

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
    const familyWithNewFields = family as any;
    const matchesSearch = family.known_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || family.category === categoryFilter;
    const matchesResidence = !residenceFilter || residenceFilter === 'all' || family.residence === residenceFilter;
    const matchesFamilyStatus = !familyStatusFilter || familyStatusFilter === 'all' || familyWithNewFields.family_status === familyStatusFilter;
    const matchesSourceOfIncome = !sourceOfIncomeFilter || sourceOfIncomeFilter === 'all' || familyWithNewFields.source_of_income?.toLowerCase().includes(sourceOfIncomeFilter.toLowerCase());
    
    return matchesSearch && matchesCategory && matchesResidence && matchesFamilyStatus && matchesSourceOfIncome;
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

  const handleView = (family: any) => {
    setViewingFamily(family);
    setIsViewDialogOpen(true);
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

  // Statistics calculations from filtered data
  const statistics = useMemo(() => {
    if (!filteredFamilies) return null;

    const totalFamilies = filteredFamilies.length;
    const byGender = filteredFamilies.reduce((acc: any, family) => {
      if (family.gender) {
        acc[family.gender] = (acc[family.gender] || 0) + 1;
      }
      return acc;
    }, {});
    const byResidence = filteredFamilies.reduce((acc: any, family) => {
      if (family.residence) {
        acc[family.residence] = (acc[family.residence] || 0) + 1;
      }
      return acc;
    }, {});
    const byCategory = filteredFamilies.reduce((acc: any, family) => {
      if (family.category) {
        acc[family.category] = (acc[family.category] || 0) + 1;
      }
      return acc;
    }, {});
    const totalBeneficiaries = filteredFamilies.reduce((sum, family) => 
      sum + (family.no_of_beneficiaries || 0), 0);

    return { totalFamilies, byGender, byResidence, byCategory, totalBeneficiaries };
  }, [filteredFamilies]);

  const handleDownload = () => {
    if (!filteredFamilies || filteredFamilies.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no family adoption records to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatFamilyAdoptionData(filteredFamilies);
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
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={getCardStyles(0)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Families
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{statistics.totalFamilies}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {statistics.totalBeneficiaries} beneficiaries
              </p>
            </CardContent>
          </Card>

          <Card className={getCardStyles(1)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                By Gender
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(statistics.byGender).map(([gender, count]: any) => (
                  <div key={gender} className="flex justify-between text-sm">
                    <span>{gender}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statistics.byGender).length === 0 && (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={getCardStyles(2)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                By Residence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(statistics.byResidence).map(([residence, count]: any) => (
                  <div key={residence} className="flex justify-between text-sm">
                    <span className="text-xs">{residence}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statistics.byResidence).length === 0 && (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={getCardStyles(3)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(statistics.byCategory).map(([category, count]: any) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-xs">{category}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statistics.byCategory).length === 0 && (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by known name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {isManagement && (
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          )}
        </div>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Guardian Ration">Guardian Ration</SelectItem>
                  <SelectItem value="Home Based Care">Home Based Care</SelectItem>
                </SelectContent>
              </Select>

              <Select value={residenceFilter} onValueChange={setResidenceFilter}>
                <SelectTrigger>
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

              <Select value={familyStatusFilter} onValueChange={setFamilyStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by family status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Family Status</SelectItem>
                  <SelectItem value="Single Parent Home">Single Parent Home</SelectItem>
                  <SelectItem value="No Parent">No Parent</SelectItem>
                  <SelectItem value="Dual Parent Home">Dual Parent Home</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceOfIncomeFilter} onValueChange={setSourceOfIncomeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by income source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Income Sources</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
              <div className="text-sm text-muted-foreground">
                <strong>Family Status:</strong> {(family as any).family_status || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Source of Income:</strong> {(family as any).source_of_income || 'Not specified'}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(family)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(family)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
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
                  </>
                )}
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Family Details
            </DialogTitle>
          </DialogHeader>
          {viewingFamily && (
            <div className="space-y-6 pt-2">
              {/* Header Section */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-foreground">{viewingFamily.known_name}</h3>
                      {viewingFamily.actual_name && (
                        <p className="text-sm text-muted-foreground">Legal Name: {viewingFamily.actual_name}</p>
                      )}
                    </div>
                    <Badge 
                      variant={viewingFamily.category === 'Guardian Ration' ? 'default' : 'secondary'}
                      className="text-sm px-3 py-1"
                    >
                      {viewingFamily.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-secondary/50">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Gender</p>
                          <p className="text-base font-medium">{viewingFamily.gender || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-secondary/50">
                          <MapPin className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Residence</p>
                          <p className="text-base font-medium">{viewingFamily.residence || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Family Information */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Family Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-accent/50">
                          <Users className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Number of Beneficiaries</p>
                          <p className="text-base font-medium">{viewingFamily.no_of_beneficiaries || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-accent/50">
                          <Activity className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Family Status</p>
                          <p className="text-base font-medium">{(viewingFamily as any)?.family_status || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Financial Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Source of Income</p>
                          <p className="text-base font-medium">{(viewingFamily as any)?.source_of_income || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Sponsor</p>
                          <p className="text-base font-medium">{viewingFamily.sponsor || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Additional Information */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    <span>Added on {new Date(viewingFamily.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}