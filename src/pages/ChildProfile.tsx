import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, FileText, Camera, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChildForm } from '@/components/ChildForm';

export default function ChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCoordinator } = useAuth();
  const [child, setChild] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchChildData();
    }
  }, [id]);

  const fetchChildData = async () => {
    try {
      // Fetch child details
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('*')
        .eq('id', id)
        .single();

      if (childError) throw childError;
      setChild(childData);

      // Fetch child programs
      const { data: programsData, error: programsError } = await supabase
        .from('child_programs')
        .select(`
          *,
          programs:program_id (name, description)
        `)
        .eq('child_id', id);

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          programs:program_id (name)
        `)
        .eq('child_id', id)
        .order('activity_date', { ascending: false });

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('child_id', id)
        .order('visit_date', { ascending: false });

      if (visitsError) throw visitsError;
      setVisits(visitsData || []);

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('child_id', id)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

    } catch (error) {
      console.error('Error fetching child data:', error);
      toast({
        title: "Error",
        description: "Failed to load child information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Child not found.</p>
        <Button onClick={() => navigate('/children')} className="mt-4">
          Back to Children
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/children')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{child.first_name} {child.last_name}</h1>
            <p className="text-muted-foreground">Child Profile</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {isCoordinator && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Child Profile</DialogTitle>
                </DialogHeader>
                <ChildForm
                  child={child}
                  onSuccess={() => {
                    setIsEditDialogOpen(false);
                    fetchChildData();
                  }}
                  onCancel={() => setIsEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={child.photo_url} alt={`${child.first_name} ${child.last_name}`} />
                <AvatarFallback className="text-lg">{getInitials(child.first_name, child.last_name)}</AvatarFallback>
              </Avatar>
              <CardTitle>{child.first_name} {child.last_name}</CardTitle>
              <CardDescription>
                Age {calculateAge(child.date_of_birth)} • {child.gender}
              </CardDescription>
              <Badge variant={child.status === 'active' ? 'default' : 'secondary'}>
                {child.status}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <span>{child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enrollment Date:</span>
                    <span>{new Date(child.enrollment_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right">{child.address || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Guardian Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{child.guardian_name || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{child.guardian_phone || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{child.guardian_email || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {(child.medical_notes || child.special_needs) && (
                <div>
                  <h4 className="font-semibold mb-2">Medical & Special Needs</h4>
                  <div className="space-y-2 text-sm">
                    {child.medical_notes && (
                      <div>
                        <span className="text-muted-foreground">Medical Notes:</span>
                        <p className="mt-1">{child.medical_notes}</p>
                      </div>
                    )}
                    {child.special_needs && (
                      <div>
                        <span className="text-muted-foreground">Special Needs:</span>
                        <p className="mt-1">{child.special_needs}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="programs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="programs" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Enrolled Programs</h3>
                {isCoordinator && (
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Enroll in Program
                  </Button>
                )}
              </div>
              
              {programs.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No programs enrolled yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {programs.map((program) => (
                    <Card key={program.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{program.programs.name}</CardTitle>
                            <CardDescription>{program.programs.description}</CardDescription>
                          </div>
                          <Badge variant={program.status === 'active' ? 'default' : 'secondary'}>
                            {program.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Enrolled:</span>
                          <span>{new Date(program.enrollment_date).toLocaleDateString()}</span>
                        </div>
                        {program.completion_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Completed:</span>
                            <span>{new Date(program.completion_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {program.notes && (
                          <div className="mt-2">
                            <span className="text-muted-foreground text-sm">Notes:</span>
                            <p className="text-sm mt-1">{program.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Recent Activities</h3>
                {isCoordinator && (
                  <Button size="sm">
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
                            <CardDescription>{activity.programs.name}</CardDescription>
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

            <TabsContent value="visits" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Visits</h3>
                {isCoordinator && (
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Visit
                  </Button>
                )}
              </div>
              
              {visits.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No visits recorded yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {visits.map((visit) => (
                    <Card key={visit.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{visit.visit_type}</CardTitle>
                            <CardDescription>{visit.location}</CardDescription>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(visit.visit_date).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {visit.purpose && (
                          <div className="mb-2">
                            <span className="text-muted-foreground text-sm">Purpose:</span>
                            <p className="text-sm mt-1">{visit.purpose}</p>
                          </div>
                        )}
                        {visit.findings && (
                          <div className="mb-2">
                            <span className="text-muted-foreground text-sm">Findings:</span>
                            <p className="text-sm mt-1">{visit.findings}</p>
                          </div>
                        )}
                        {visit.recommendations && (
                          <div>
                            <span className="text-muted-foreground text-sm">Recommendations:</span>
                            <p className="text-sm mt-1">{visit.recommendations}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Documents</h3>
                {isCoordinator && (
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                )}
              </div>
              
              {documents.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No documents uploaded yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {documents.map((document) => (
                    <Card key={document.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{document.title}</CardTitle>
                            <CardDescription>{document.description}</CardDescription>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(document.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm text-muted-foreground">File: {document.file_name}</span>
                            {document.category && (
                              <Badge variant="outline" className="ml-2">{document.category}</Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline">Download</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}