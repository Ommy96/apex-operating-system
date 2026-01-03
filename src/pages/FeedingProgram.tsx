import { useState, useMemo } from "react";
import { Plus, Search, Filter, Download, Edit, Trash2, Users, User, Eye, Activity, MapPin, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeedingProgramForm } from "@/components/FeedingProgramForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatFeedingProgramData } from "@/lib/downloadUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { StatsCard } from "@/components/StatsCard";

export default function FeedingProgram() {
  const { isAdmin, isManagement } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [viewingProgram, setViewingProgram] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const { toast } = useToast();

  const { data: feedingPrograms, refetch } = useQuery({
    queryKey: ['feeding-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feeding_program')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredPrograms = feedingPrograms?.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || typeFilter === 'all' || program.type === typeFilter;
    const matchesLevel = !levelFilter || levelFilter === 'all' || program.academic_level === levelFilter;
    
    return matchesSearch && matchesType && matchesLevel;
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingProgram(null);
    refetch();
  };

  const handleEdit = (program: any) => {
    setEditingProgram(program);
    setIsDialogOpen(true);
  };

  const handleView = (program: any) => {
    setViewingProgram(program);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (programId: string) => {
    try {
      const { error } = await supabase
        .from('feeding_program')
        .delete()
        .eq('id', programId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Beneficiary deleted successfully",
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      toast({
        title: "Error",
        description: "Failed to delete beneficiary",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProgram(null);
  };

  // Calculate statistics from filtered data
  const statistics = useMemo(() => {
    if (!filteredPrograms) return null;

    const totalBeneficiaries = filteredPrograms.length;
    const byGender = filteredPrograms.reduce((acc: any, program) => {
      if (program.gender) {
        acc[program.gender] = (acc[program.gender] || 0) + 1;
      }
      return acc;
    }, {});
    const byType = filteredPrograms.reduce((acc: any, program) => {
      if (program.type) {
        acc[program.type] = (acc[program.type] || 0) + 1;
      }
      return acc;
    }, {});
    const withSponsorship = filteredPrograms.filter(p => p.education_sponsorship).length;

    return { totalBeneficiaries, byGender, byType, withSponsorship };
  }, [filteredPrograms]);

  const handleDownload = () => {
    if (!filteredPrograms || filteredPrograms.length === 0) {
      toast({
        title: "No Data",
        description: "No feeding program data to download",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatFeedingProgramData(filteredPrograms);
    downloadExcel(formattedData, 'Feeding_Program', 'Feeding Program');
    
    toast({
      title: "Success",
      description: "Feeding program data downloaded successfully",
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <PageHeroHeader
        title="Feeding Program"
        description="Manage feeding program beneficiaries"
        icon={Utensils}
        iconColorClass="text-primary-foreground"
        actions={
          <div className="flex gap-2">
            {isManagement && (
              <Button onClick={handleDownload} variant="outline" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0">
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            )}
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent-dark text-accent-foreground shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Beneficiary
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProgram ? 'Edit Beneficiary' : 'Add Feeding Program Beneficiary'}
                    </DialogTitle>
                  </DialogHeader>
                  <FeedingProgramForm
                    program={editingProgram}
                    onSuccess={handleSuccess}
                    onCancel={handleDialogClose}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
        stats={statistics ? [
          { label: 'Total Beneficiaries', value: statistics.totalBeneficiaries, icon: Users },
          { label: 'With Sponsorship', value: statistics.withSponsorship, icon: Activity },
        ] : undefined}
      />

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Beneficiaries"
            value={statistics.totalBeneficiaries}
            icon={Users}
            colorVariant="blue"
          />
          <StatsCard
            title="By Gender"
            value=""
            icon={User}
            colorVariant="emerald"
          >
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
          </StatsCard>
          <StatsCard
            title="By Program Type"
            value=""
            icon={MapPin}
            colorVariant="purple"
          >
            <div className="space-y-1">
              {Object.entries(statistics.byType).map(([type, count]: any) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-xs">{type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(statistics.byType).length === 0 && (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </div>
          </StatsCard>
          <StatsCard
            title="With Sponsorship"
            value={statistics.withSponsorship}
            subtitle="Education sponsorship"
            icon={Activity}
            colorVariant="orange"
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Kawangware Lunch Hour">Kawangware Lunch Hour</SelectItem>
            <SelectItem value="Kibera Early Dinner">Kibera Early Dinner</SelectItem>
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Pre Primary">Pre Primary</SelectItem>
            <SelectItem value="Lower Primary">Lower Primary</SelectItem>
            <SelectItem value="Upper Primary">Upper Primary</SelectItem>
            <SelectItem value="Junior Secondary School">Junior Secondary School</SelectItem>
            <SelectItem value="Secondary School">Secondary School</SelectItem>
            <SelectItem value="Tertiary">Tertiary</SelectItem>
            <SelectItem value="Special School">Special School</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms?.map((program) => (
          <Card key={program.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{program.name}</span>
                <Badge variant={program.type === 'Kawangware Lunch Hour' ? 'default' : 'secondary'}>
                  {program.type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Gender:</strong> {program.gender || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Academic Level:</strong> {program.academic_level || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Grade:</strong> {program.grade || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Contact:</strong> {program.contact || 'Not provided'}
              </div>
              {program.education_sponsorship && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Education Sponsorship
                </Badge>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(program)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(program)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {program.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(program.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
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

      {filteredPrograms?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No feeding program beneficiaries found.</p>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Beneficiary Details</DialogTitle>
          </DialogHeader>
          {viewingProgram && (
            <div className="space-y-4">
              {/* Header */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{viewingProgram.name}</h3>
                      <p className="text-muted-foreground mt-1">Feeding Program Beneficiary</p>
                    </div>
                    <Badge variant={viewingProgram.type === 'Kawangware Lunch Hour' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                      {viewingProgram.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{viewingProgram.gender || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Academic Level</p>
                    <p className="font-medium">{viewingProgram.academic_level || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="font-medium">{viewingProgram.grade || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{viewingProgram.contact || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* School Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    School Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm text-muted-foreground">School Name</p>
                  <p className="font-medium">{viewingProgram.school || 'Not specified'}</p>
                </CardContent>
              </Card>

              {/* Sponsorship Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" />
                    Sponsorship Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingProgram.education_sponsorship ? (
                    <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                      ✓ Active Education Sponsorship
                    </Badge>
                  ) : (
                    <p className="text-muted-foreground">No active education sponsorship</p>
                  )}
                </CardContent>
              </Card>

              {/* Administrative Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Administrative Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date Added</p>
                  <p className="font-medium">{new Date(viewingProgram.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}