import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Search, Filter, FileText, Eye, Edit2, Trash2, BookOpen, Award, Download, Users, Building2, MapPin, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChildForm } from '@/components/ChildForm';
import { downloadExcel, formatEducationData } from '@/lib/downloadUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  photo_url: string;
  address: string;
  guardian_name: string;
  guardian_phone: string;
  enrollment_date: string;
  status: string;
  replacement_status: string;
  academic_level: string;
  grade: string;
  institution_name: string;
  residence: string;
  donor: string;
}

interface EducationStats {
  totalStudents: number;
  numberOfMale: number;
  numberOfSchools: number;
  percentageInKibera: number;
}

type ResidenceType = 'Kibera' | 'Kawangware' | 'Diaspora' | 'Outside Nairobi';
type AcademicLevelType = 'Pre Primary' | 'Lower Primary' | 'Upper Primary' | 'Junior Secondary' | 'Secondary School' | 'Tertiary' | 'Special School' | 'Junior School';

interface Filters {
  location: string;
  academicLevel: string;
  donor: string;
}

export default function Children() {
  const navigate = useNavigate();
  const { isAdmin, isManagement } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    location: '',
    academicLevel: '',
    donor: ''
  });

  const [stats, setStats] = useState<EducationStats>({
    totalStudents: 0,
    numberOfMale: 0,
    numberOfSchools: 0,
    percentageInKibera: 0
  });

  const academicLevels = [
    'Pre Primary',
    'Lower Primary',
    'Upper Primary',
    'Junior Secondary',
    'Secondary School',
    'Tertiary',
    'Special School',
    'Junior School'
  ];

  const residenceTypes = [
    'Kibera',
    'Kawangware', 
    'Diaspora',
    'Outside Nairobi'
  ];

  // Get unique donors from children data
  const uniqueDonors = [...new Set(children.map(child => child.donor).filter(Boolean))].sort();

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (filters.location || filters.academicLevel || filters.donor) {
      fetchFilteredData();
    }
  }, [filters]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .order('first_name');

      if (error) throw error;
      setChildren(data || []);
      
      // Calculate education stats
      const educationChildren = data?.filter(child => child.academic_level) || [];
      const totalStudents = educationChildren.length;
      const maleStudents = educationChildren.filter(child => child.gender === 'Male').length;
      const uniqueSchools = new Set(educationChildren.map(child => child.institution_name).filter(Boolean)).size;
      const kiberaStudents = educationChildren.filter(child => child.residence === 'Kibera').length;
      const kiberaPercentage = totalStudents > 0 ? Math.round((kiberaStudents / totalStudents) * 100) : 0;
      
      setStats({
        totalStudents,
        numberOfMale: maleStudents,
        numberOfSchools: uniqueSchools,
        percentageInKibera: kiberaPercentage
      });
    } catch (error) {
      console.error('Error fetching children:', error);
      toast({
        title: "Error",
        description: "Failed to load children",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredData = async () => {
    setFilterLoading(true);
    try {
      let query = supabase
        .from('children')
        .select('*')
        .not('academic_level', 'is', null);

      if (filters.location) {
        query = query.eq('residence', filters.location as ResidenceType);
      }

      if (filters.academicLevel) {
        query = query.eq('academic_level', filters.academicLevel as AcademicLevelType);
      }

      if (filters.donor) {
        query = query.eq('donor', filters.donor);
      }

      const { data, error } = await query.order('first_name');

      if (error) throw error;
      
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching filtered data:', error);
      toast({
        title: "Error",
        description: "Failed to apply filters",
        variant: "destructive",
      });
    } finally {
      setFilterLoading(false);
    }
  };

  const handleDelete = async (childId: string) => {
    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Child record deleted successfully",
      });
      
      fetchChildren();
    } catch (error) {
      console.error('Error deleting child:', error);
      toast({
        title: "Error",
        description: "Failed to delete child record",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilters({ location: '', academicLevel: '', donor: '' });
    fetchChildren();
  };

  const hasActiveFilters = filters.location || filters.academicLevel || filters.donor;

  const getFilteredChildren = () => {
    // Only show children with academic_level (education program)
    const filtered = children.filter(child => child.academic_level);
    
    return filtered.filter(child =>
      `${child.first_name} ${child.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.guardian_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.institution_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.academic_level?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const convertGoogleDriveUrl = (url: string) => {
    if (!url) return url;
    const trimmed = url.trim();

    if (trimmed.includes('drive.google.com/uc?')) {
      try {
        const u = new URL(trimmed);
        u.searchParams.set('export', 'view');
        return u.toString();
      } catch {
        return trimmed;
      }
    }

    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;

    const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParam) return `https://drive.google.com/uc?export=view&id=${idParam[1]}`;

    const thumbMatch = trimmed.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/);
    if (thumbMatch) return `https://drive.google.com/uc?export=view&id=${thumbMatch[1]}`;

    return trimmed;
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDownload = () => {
    const educationChildren = children.filter(child => child.academic_level);
    if (educationChildren.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no education records to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatEducationData(educationChildren);
    downloadExcel(formattedData, 'education_records', 'Education Records');
    
    toast({
      title: "Download started",
      description: "Your education records are being downloaded.",
    });
  };

  const filteredChildren = getFilteredChildren();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Children & Education
          </h1>
          <p className="text-muted-foreground">
            Monitor academic progress and educational support
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingChild(null)} className="bg-gradient-accent hover:bg-gradient-accent/90 shadow-strong">
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingChild ? 'Edit Child' : 'Add New Child'}</DialogTitle>
              </DialogHeader>
              <ChildForm
                child={editingChild}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  setEditingChild(null);
                  fetchChildren();
                }}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingChild(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Education Program Content */}
      <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  In education program
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Number of Male</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.numberOfMale}</div>
                <p className="text-xs text-muted-foreground">
                  Male students enrolled
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Number of Schools</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.numberOfSchools}</div>
                <p className="text-xs text-muted-foreground">
                  Different institutions
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Percentage in Kibera</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.percentageInKibera}%</div>
                <p className="text-xs text-muted-foreground">
                  Students in Kibera
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, school, or academic level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={hasActiveFilters ? 'border-primary' : ''}>
                    {filterLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Filter className="h-4 w-4 mr-2" />
                    )}
                    Filter
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2 h-5 min-w-5 flex items-center justify-center p-0">
                        {Object.values(filters).filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Filter Students</h4>
                      <p className="text-sm text-muted-foreground">
                        Filter by location and academic level
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location</label>
                        <Select
                          value={filters.location}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {residenceTypes.map((location) => (
                              <SelectItem key={location} value={location}>
                                {location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Academic Level</label>
                        <Select
                          value={filters.academicLevel}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, academicLevel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic level" />
                          </SelectTrigger>
                          <SelectContent>
                            {academicLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Donor</label>
                        <Select
                          value={filters.donor}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, donor: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select donor" />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueDonors.map((donor) => (
                              <SelectItem key={donor} value={donor}>
                                {donor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {hasActiveFilters && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFilters}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              {isManagement && (
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Download Excel</span>
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.location && (
                <Badge variant="secondary" className="gap-1">
                  Location: {filters.location}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, location: '' }))}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.academicLevel && (
                <Badge variant="secondary" className="gap-1">
                  Level: {filters.academicLevel}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, academicLevel: '' }))}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.donor && (
                <Badge variant="secondary" className="gap-1">
                  Donor: {filters.donor}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, donor: '' }))}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChildren.map((child) => (
              <Card key={child.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 rounded-full border-2 border-border">
                      <AvatarImage 
                        src={convertGoogleDriveUrl(child.photo_url)} 
                        alt={`${child.first_name} ${child.last_name}`} 
                        className="object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).onerror = null;
                          (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <AvatarFallback className="text-lg font-semibold">
                        {getInitials(child.first_name, child.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{child.first_name} {child.last_name}</CardTitle>
                      <CardDescription>
                        {child.date_of_birth && `Age ${calculateAge(child.date_of_birth)}`} • {child.gender}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Academic Level:</span>
                      <Badge variant="outline">{child.academic_level || 'Not specified'}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Grade:</span>
                      <span>{child.grade || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">School:</span>
                      <span className="text-right text-xs">{child.institution_name || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={child.status === 'active' ? 'default' : 'secondary'}>
                        {child.status}
                      </Badge>
                    </div>
                    {child.donor && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Donor:</span>
                        <span className="text-right text-xs">{child.donor}</span>
                      </div>
                    )}
                    {child.replacement_status === 'replaced' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Replacement:</span>
                        <Badge variant="destructive" className="text-xs">
                          Replaced
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => navigate(`/children/${child.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the child's record and all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(child.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {filteredChildren.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No children found matching your criteria.</p>
          </div>
        )}
      </div>
    );
  }