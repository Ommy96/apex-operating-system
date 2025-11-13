import { useState, useMemo } from "react";
import { Plus, Search, Trophy, Star, Download, Edit, Trash2, Eye, Users, Music, MapPin } from "lucide-react";
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
  const { isAdmin, isManagement } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
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

  const handleView = (member: any) => {
    setViewingMember(member);
    setIsViewDialogOpen(true);
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

  const statistics = useMemo(() => {
    if (!filteredMembers) return null;

    const totalMembers = filteredMembers.length;
    const byTalent = filteredMembers.reduce((acc: any, member) => {
      acc[member.talent_category] = (acc[member.talent_category] || 0) + 1;
      return acc;
    }, {});
    const byLocation = filteredMembers.reduce((acc: any, member) => {
      if (member.location) {
        acc[member.location] = (acc[member.location] || 0) + 1;
      }
      return acc;
    }, {});
    const byGender = filteredMembers.reduce((acc: any, member) => {
      if (member.gender) {
        acc[member.gender] = (acc[member.gender] || 0) + 1;
      }
      return acc;
    }, {});

    return { totalMembers, byTalent, byLocation, byGender };
  }, [filteredMembers]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kipawa Sato</h1>
          <p className="text-muted-foreground">Talent development and mentorship program</p>
        </div>
        
        <div className="flex gap-2">
          {isManagement && (
            <Button onClick={handleDownload} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          )}
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{statistics.totalMembers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Music className="h-4 w-4" />
                Top Talent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(statistics.byTalent).length > 0
                  ? Object.entries(statistics.byTalent).sort((a: any, b: any) => b[1] - a[1])[0][0]
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(statistics.byTalent).length > 0
                  ? `${Object.entries(statistics.byTalent).sort((a: any, b: any) => b[1] - a[1])[0][1]} members`
                  : 'No data'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(statistics.byLocation).map(([location, count]: any) => (
                  <div key={location} className="flex justify-between text-sm">
                    <span>{location}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statistics.byLocation).length === 0 && (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border-muted/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gender Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(statistics.byGender).map(([gender, count]: any) => (
                  <div key={gender} className="flex justify-between text-sm">
                    <span className="capitalize">{gender}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statistics.byGender).length === 0 && (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(member)}
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
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No Kipawa Sato members found.</p>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {viewingMember && (
            <div className="space-y-4">
              {/* Header Card */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    {getTalentIcon(viewingMember.talent_category)}
                    {viewingMember.full_name}
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit mt-2">
                    {viewingMember.talent_category}
                  </Badge>
                </CardHeader>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Age</p>
                      <p className="text-base font-medium">{viewingMember.age || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Gender</p>
                      <p className="text-base font-medium">{viewingMember.gender || 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-base font-medium">{viewingMember.location || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Talent & Skills */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Talent & Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Specific Skill</p>
                    <p className="text-base font-medium">{viewingMember.specific_skill || 'Not specified'}</p>
                  </div>
                  {viewingMember.awards_recognition && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Awards & Recognition</p>
                      <p className="text-base font-medium">{viewingMember.awards_recognition}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Academic & Enrollment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Academic & Enrollment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Academic Level</p>
                      <p className="text-base font-medium">{viewingMember.academic_level || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Year Enrolled</p>
                      <p className="text-base font-medium">{viewingMember.year_enrolled || 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">School Support</p>
                    {viewingMember.school_support_given ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        School Support Given
                      </Badge>
                    ) : (
                      <p className="text-base text-muted-foreground">No school support provided</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Coaching & Mentorship */}
              {viewingMember.coach_mentor_name && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Coaching & Mentorship
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Coach/Mentor Name</p>
                      <p className="text-base font-medium">{viewingMember.coach_mentor_name}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Administrative Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Music className="h-5 w-5 text-primary" />
                    Administrative Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date Added</p>
                    <p className="text-base font-medium">
                      {new Date(viewingMember.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
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