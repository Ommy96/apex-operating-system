import { useState } from "react";
import { Plus, Search, Trophy, Star, Download, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KipawaSatoForm } from "@/components/KipawaSatoForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatKipawaSatoData } from "@/lib/downloadUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function KipawaSato() {
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const { toast } = useToast();

  const { data: kipawaSatoMembers, refetch } = useQuery({
    queryKey: ['kipawa-sato'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kipawa_sato')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredMembers = kipawaSatoMembers?.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || member.talent_category === categoryFilter;
    const matchesLocation = !locationFilter || locationFilter === 'all' || member.location === locationFilter;
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingMember(null);
    refetch();
  };

  const handleEdit = (member: any) => {
    setEditingMember(member);
    setIsDialogOpen(true);
  };

  const handleDelete = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('kipawa_sato')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingMember(null);
  };

  const handleDownload = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      toast({
        title: "No Data",
        description: "No Kipawa Sato members to download",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatKipawaSatoData(filteredMembers);
    downloadExcel(formattedData, 'Kipawa_Sato_Members', 'Kipawa Sato');
    
    toast({
      title: "Success",
      description: "Kipawa Sato data downloaded successfully",
    });
  };

  const getTalentIcon = (category: string) => {
    switch (category) {
      case 'Sport':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kipawa Sato</h1>
          <p className="text-muted-foreground">Talent development and mentorship program</p>
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
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-full sm:w-[90vw]">
                <DialogHeader>
                  <DialogTitle>
                    {editingMember ? 'Edit Kipawa Sato Member' : 'Add Kipawa Sato Member'}
                  </DialogTitle>
                </DialogHeader>
                <KipawaSatoForm
                  member={editingMember}
                  onSuccess={handleSuccess}
                  onCancel={handleDialogClose}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
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
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by talent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Talents</SelectItem>
            <SelectItem value="Music">Music</SelectItem>
            <SelectItem value="Dance">Dance</SelectItem>
            <SelectItem value="Poetry">Poetry</SelectItem>
            <SelectItem value="Art & Craft">Art & Craft</SelectItem>
            <SelectItem value="Sport">Sport</SelectItem>
            <SelectItem value="Boardgames">Boardgames</SelectItem>
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="Kibera">Kibera</SelectItem>
            <SelectItem value="Kawangware">Kawangware</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers?.map((member) => (
          <Card key={member.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{member.full_name}</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getTalentIcon(member.talent_category)}
                  {member.talent_category}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Age:</strong> {member.age || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Gender:</strong> {member.gender || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Specific Skill:</strong> {member.specific_skill || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Location:</strong> {member.location || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Academic Level:</strong> {member.academic_level || 'Not specified'}
              </div>
              {member.coach_mentor_name && (
                <div className="text-sm text-muted-foreground">
                  <strong>Coach/Mentor:</strong> {member.coach_mentor_name}
                </div>
              )}
              {member.year_enrolled && (
                <div className="text-sm text-muted-foreground">
                  <strong>Year Enrolled:</strong> {member.year_enrolled}
                </div>
              )}
              {member.awards_recognition && (
                <div className="text-sm">
                  <strong>Awards:</strong> {member.awards_recognition}
                </div>
              )}
              {member.school_support_given && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  School Support Given
                </Badge>
              )}
              
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(member)}
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
                        <AlertDialogTitle>Delete Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {member.full_name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(member.id)}
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

      {filteredMembers?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No Kipawa Sato members found.</p>
        </div>
      )}
    </div>
  );
}