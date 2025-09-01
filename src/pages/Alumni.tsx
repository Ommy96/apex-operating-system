import { useState } from "react";
import { Plus, Search, GraduationCap, MapPin, Calendar, Briefcase, Eye, Edit, Trash2, Users, Award, Mail, Phone, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlumniForm } from "@/components/AlumniForm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Alumni() {
  const { isManagement, isAdmin, isStaff } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<any>(null);
  const [viewingAlumni, setViewingAlumni] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const { toast } = useToast();

  // Fetch alumni data
  const { data: alumni, refetch } = useQuery({
    queryKey: ['alumni'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('exit_year', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const stats = {
    total: alumni?.length || 0,
    working: alumni?.filter(a => a.current_status === 'Working').length || 0,
    studying: alumni?.filter(a => a.current_status === 'Studying').length || 0,
    entrepreneurship: alumni?.filter(a => a.current_status === 'Entrepreneurship').length || 0,
    thisYear: alumni?.filter(a => a.exit_year === new Date().getFullYear()).length || 0,
  };

  // Get unique values for filters
  const uniqueYears = [...new Set(alumni?.map(a => a.exit_year).filter(Boolean))].sort((a, b) => b - a);
  const uniqueLocations = [...new Set(alumni?.map(a => a.location).filter(Boolean))].sort();

  // Filter alumni based on search and filters
  const filteredAlumni = alumni?.filter(alumnus => {
    const matchesSearch = alumnus.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alumnus.short_bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alumnus.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || alumnus.current_status === statusFilter;
    const matchesYear = yearFilter === 'all' || alumnus.exit_year?.toString() === yearFilter;
    const matchesGender = genderFilter === 'all' || alumnus.gender === genderFilter;
    const matchesLocation = locationFilter === 'all' || alumnus.location === locationFilter;
    
    return matchesSearch && matchesStatus && matchesYear && matchesGender && matchesLocation;
  });

  const handleEdit = (alumnus: any) => {
    setEditingAlumni(alumnus);
    setIsDialogOpen(true);
  };

  const handleView = (alumnus: any) => {
    setViewingAlumni(alumnus);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (alumniId: string) => {
    try {
      const { error } = await supabase
        .from('alumni')
        .delete()
        .eq('id', alumniId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alumni record deleted successfully",
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting alumni:', error);
      toast({
        title: "Error",
        description: "Failed to delete alumni record. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAlumni(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Working': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Studying': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Entrepreneurship': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Alumni
          </h1>
          <p className="text-muted-foreground">Celebrating our graduates and their achievements</p>
        </div>
        
        {/* Add Alumni Button - Only for Management/Admin */}
        {(isManagement || isAdmin) && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Alumni
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAlumni ? 'Edit Alumni' : 'Add New Alumni'}</DialogTitle>
              </DialogHeader>
              <AlumniForm 
                initialData={editingAlumni}
                onSuccess={() => {
                  handleDialogClose();
                  refetch();
                }} 
                onCancel={handleDialogClose} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alumni</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All graduates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working</CardTitle>
            <Briefcase className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.working}</div>
            <p className="text-xs text-muted-foreground">In employment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Studying</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.studying}</div>
            <p className="text-xs text-muted-foreground">Pursuing education</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrepreneurs</CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.entrepreneurship}</div>
            <p className="text-xs text-muted-foreground">Running businesses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.thisYear}</div>
            <p className="text-xs text-muted-foreground">Recent graduates</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, bio, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Working">Working</SelectItem>
              <SelectItem value="Studying">Studying</SelectItem>
              <SelectItem value="Entrepreneurship">Entrepreneurship</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {uniqueYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All Genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alumni Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAlumni?.map((alumnus) => (
          <Card key={alumnus.id} className="hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={alumnus.profile_photo_url} alt={alumnus.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                      {getInitials(alumnus.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{alumnus.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Class of {alumnus.exit_year}
                    </p>
                  </div>
                </div>
                
                {/* Actions Menu - Only for Management/Admin */}
                {(isManagement || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="sr-only">Actions</span>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(alumnus)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(alumnus)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Alumni Record</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {alumnus.full_name}'s alumni record? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(alumnus.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(alumnus.current_status)}>
                  {alumnus.current_status}
                </Badge>
                {alumnus.location && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {alumnus.location}
                  </span>
                )}
              </div>
              
              <p className="text-sm line-clamp-2">{alumnus.short_bio}</p>
              
              {alumnus.achievements && (
                <div className="text-xs text-muted-foreground">
                  <Award className="h-3 w-3 inline mr-1" />
                  {alumnus.achievements.substring(0, 60)}...
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  {alumnus.contact_email && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`mailto:${alumnus.contact_email}`} title="Email">
                        <Mail className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {alumnus.contact_phone && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`tel:${alumnus.contact_phone}`} title="Phone">
                        <Phone className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {alumnus.social_link && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={alumnus.social_link} target="_blank" rel="noopener noreferrer" title="Social Link">
                        <LinkIcon className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                
                <Button variant="outline" size="sm" onClick={() => handleView(alumnus)}>
                  <Eye className="h-3 w-3 mr-1" />
                  View More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAlumni?.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No alumni found matching your criteria.</p>
        </div>
      )}

      {/* View Alumni Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Alumni Profile
            </DialogTitle>
          </DialogHeader>
          {viewingAlumni && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={viewingAlumni.profile_photo_url} alt={viewingAlumni.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl">
                    {getInitials(viewingAlumni.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{viewingAlumni.full_name}</h2>
                  <p className="text-lg text-muted-foreground">{viewingAlumni.short_bio}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className={getStatusColor(viewingAlumni.current_status)}>
                      {viewingAlumni.current_status}
                    </Badge>
                    {viewingAlumni.location && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {viewingAlumni.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Class of {viewingAlumni.exit_year}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Story */}
              {viewingAlumni.detailed_story && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Their Journey</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{viewingAlumni.detailed_story}</p>
                  </div>
                </div>
              )}

              {/* Achievements */}
              {viewingAlumni.achievements && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievements & Recognition
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{viewingAlumni.achievements}</p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {viewingAlumni.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${viewingAlumni.contact_email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {viewingAlumni.contact_email}
                      </a>
                    </div>
                  )}
                  {viewingAlumni.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${viewingAlumni.contact_phone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {viewingAlumni.contact_phone}
                      </a>
                    </div>
                  )}
                  {viewingAlumni.social_link && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={viewingAlumni.social_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Social Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                {(isManagement || isAdmin) && (
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEdit(viewingAlumni);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}