import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Search, Filter, Eye, Edit2, BookOpen, Award, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadExcel, formatEducationData } from '@/lib/downloadUtils';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  photo_url: string;
  academic_level: string;
  grade: string;
  institution_name: string;
  enrollment_date: string;
  status: string;
}

interface EducationStats {
  totalStudents: number;
  activePrograms: number;
  completedThisMonth: number;
  averageAttendance: number;
}

export default function Education() {
  const { isCoordinator } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<EducationStats>({
    totalStudents: 0,
    activePrograms: 0,
    completedThisMonth: 0,
    averageAttendance: 85
  });

  useEffect(() => {
    fetchEducationData();
  }, []);

  const fetchEducationData = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .not('academic_level', 'is', null)
        .order('first_name');

      if (error) throw error;
      
      setChildren(data || []);
      setStats({
        totalStudents: data?.length || 0,
        activePrograms: 4,
        completedThisMonth: 12,
        averageAttendance: 85
      });
    } catch (error) {
      console.error('Error fetching education data:', error);
      toast({
        title: "Error",
        description: "Failed to load education data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child =>
    `${child.first_name} ${child.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.institution_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.academic_level?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
  if (children.length === 0) {
    toast({
      title: "No data to download",
      description: "There are no education records to export.",
      variant: "destructive",
    });
    return;
  }

  const formattedData = formatEducationData(children);
  downloadExcel(formattedData, 'education_records', 'Education Records');
  
  toast({
    title: "Download started",
    description: "Your education records are being downloaded.",
  });
};

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
            Education Program
          </h1>
          <p className="text-muted-foreground">Monitor academic progress and educational support</p>
        </div>
      </div>

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
              +12 new this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePrograms}</div>
            <p className="text-xs text-muted-foreground">
              Across all levels
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graduated This Month</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              +4 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageAttendance}%</div>
            <p className="text-xs text-muted-foreground">
              +2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, school, or academic level..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </Button>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChildren.map((child) => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={child.photo_url} alt={`${child.first_name} ${child.last_name}`} />
                  <AvatarFallback>{getInitials(child.first_name, child.last_name)}</AvatarFallback>
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
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Progress
                </Button>
                {isCoordinator && (
                  <Button size="sm" variant="outline">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredChildren.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No students found in education program.</p>
        </div>
      )}
    </div>
  );
}