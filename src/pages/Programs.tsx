import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Filter, Users, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Programs() {
  const { programName } = useParams();
  const { isCoordinator } = useAuth();
  const [program, setProgram] = useState<any>(null);
  const [enrolledChildren, setEnrolledChildren] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (programName) {
      fetchProgramData();
    }
  }, [programName]);

  const fetchProgramData = async () => {
    try {
      // Fetch program details
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('name', decodeURIComponent(programName || ''))
        .single();

      if (programError) throw programError;
      setProgram(programData);

      // Fetch enrolled children
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('child_programs')
        .select(`
          *,
          children:child_id (
            id,
            first_name,
            last_name,
            date_of_birth,
            gender,
            photo_url,
            status
          )
        `)
        .eq('program_id', programData.id)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;
      setEnrolledChildren(enrollmentsData || []);

      // Fetch recent activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          children:child_id (first_name, last_name)
        `)
        .eq('program_id', programData.id)
        .order('activity_date', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

    } catch (error) {
      console.error('Error fetching program data:', error);
      toast({
        title: "Error",
        description: "Failed to load program information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const filteredChildren = enrolledChildren.filter(enrollment =>
    `${enrollment.children.first_name} ${enrollment.children.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Program not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{program.name}</h1>
          <p className="text-muted-foreground">{program.description}</p>
        </div>
        {isCoordinator && (
          <div className="flex space-x-2">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Manage Enrollments
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrolledChildren.length}</div>
            <p className="text-xs text-muted-foreground">Active enrollments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Program completion</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="children" className="space-y-4">
        <TabsList>
          <TabsTrigger value="children">Enrolled Children</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search children..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChildren.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {enrollment.children.first_name.charAt(0)}{enrollment.children.last_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {enrollment.children.first_name} {enrollment.children.last_name}
                      </CardTitle>
                      <CardDescription>
                        Age {calculateAge(enrollment.children.date_of_birth)} • {enrollment.children.gender}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Enrolled:</span>
                      <span>{new Date(enrollment.enrollment_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                        {enrollment.status}
                      </Badge>
                    </div>
                    {enrollment.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1 text-xs">{enrollment.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredChildren.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No children found matching your search.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recent Activities</h3>
            {isCoordinator && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            )}
          </div>

          {activities.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No activities recorded yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{activity.title}</CardTitle>
                        <CardDescription>
                          {activity.children.first_name} {activity.children.last_name}
                        </CardDescription>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(activity.activity_date).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  {(activity.description || activity.outcome) && (
                    <CardContent>
                      {activity.description && (
                        <div className="mb-2">
                          <span className="text-muted-foreground text-sm">Description:</span>
                          <p className="text-sm mt-1">{activity.description}</p>
                        </div>
                      )}
                      {activity.outcome && (
                        <div>
                          <span className="text-muted-foreground text-sm">Outcome:</span>
                          <p className="text-sm mt-1">{activity.outcome}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Program Reports</h3>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary</CardTitle>
                <CardDescription>Program performance for this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Activities:</span>
                    <span className="font-semibold">{activities.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Children:</span>
                    <span className="font-semibold">{enrolledChildren.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completion Rate:</span>
                    <span className="font-semibold">85%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quarterly Overview</CardTitle>
                <CardDescription>Program trends over the quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>New Enrollments:</span>
                    <span className="font-semibold text-green-600">+12</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completions:</span>
                    <span className="font-semibold text-blue-600">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Activities:</span>
                    <span className="font-semibold">156</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}