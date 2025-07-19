import { useState } from "react";
import { Plus, Search, Filter, Download, Edit, Trash2, Users, User } from "lucide-react";
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

export default function FeedingProgram() {
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
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

  // Calculate statistics
  const totalBeneficiaries = feedingPrograms?.length || 0;
  const maleCount = feedingPrograms?.filter(p => p.gender === 'Male').length || 0;
  const femaleCount = feedingPrograms?.filter(p => p.gender === 'Female').length || 0;
  const kawangwareCount = feedingPrograms?.filter(p => p.type === 'Kawangware Lunch Hour').length || 0;
  const kiberaCount = feedingPrograms?.filter(p => p.type === 'Kibera Early Dinner').length || 0;

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feeding Program</h1>
          <p className="text-muted-foreground">Manage feeding program beneficiaries</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button>
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
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeneficiaries}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Male Students</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maleCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Female Students</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{femaleCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kawangware Program</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kawangwareCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kibera Program</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kiberaCount}</div>
          </CardContent>
        </Card>
      </div>

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
            <SelectItem value="Junior Secondary">Junior Secondary</SelectItem>
            <SelectItem value="Secondary School">Secondary School</SelectItem>
            <SelectItem value="Tertiary">Tertiary</SelectItem>
            <SelectItem value="Special School">Special School</SelectItem>
            <SelectItem value="Junior School">Junior School</SelectItem>
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
              
              {isAdmin && (
                <div className="flex gap-2 pt-2">
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
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrograms?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No feeding program beneficiaries found.</p>
        </div>
      )}
    </div>
  );
}