import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, FileText, Camera, Plus, Trash2 } from 'lucide-react';
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
import { DocumentLinkForm } from '@/components/DocumentLinkForm';
import { VisitReportForm } from '@/components/VisitReportForm';
import { ProgramEnrollmentForm } from '@/components/ProgramEnrollmentForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function ChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [child, setChild] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
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

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      
      fetchChildData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
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
          {isAdmin && (
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
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="programs" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold">Enrolled Programs</h3>
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Enroll in Program
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enroll in Program</DialogTitle>
                      </DialogHeader>
                      <ProgramEnrollmentForm childId={id} onSuccess={fetchChildData} />
                    </DialogContent>
                  </Dialog>
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


            <TabsContent value="visits" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold">Visits</h3>
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Visit Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Visit Report</DialogTitle>
                      </DialogHeader>
                      <VisitReportForm childId={id} onSuccess={fetchChildData} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Home Visit Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {visits.find(visit => visit.visit_type === 'home_visit') ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          const homeVisit = visits.find(visit => visit.visit_type === 'home_visit');
                          if (homeVisit) {
                            // Navigate to a detailed view or show modal with visit details
                            console.log('View home visit:', homeVisit);
                          }
                        }}
                      >
                        View Report
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">No report added</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">School Visit Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {visits.find(visit => visit.visit_type === 'school_visit') ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          const schoolVisit = visits.find(visit => visit.visit_type === 'school_visit');
                          if (schoolVisit) {
                            console.log('View school visit:', schoolVisit);
                          }
                        }}
                      >
                        View Report
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">No report added</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Medical Visit Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {visits.find(visit => visit.visit_type === 'medical_visit') ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          const medicalVisit = visits.find(visit => visit.visit_type === 'medical_visit');
                          if (medicalVisit) {
                            console.log('View medical visit:', medicalVisit);
                          }
                        }}
                      >
                        View Report
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">No report added</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Follow-up Visit Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {visits.find(visit => visit.visit_type === 'follow_up') ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          const followUpVisit = visits.find(visit => visit.visit_type === 'follow_up');
                          if (followUpVisit) {
                            console.log('View follow-up visit:', followUpVisit);
                          }
                        }}
                      >
                        View Report
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">No report added</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {visits.filter(visit => !['home_visit', 'school_visit', 'medical_visit', 'follow_up'].includes(visit.visit_type)).length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-3">Other Visits</h4>
                  <div className="space-y-3">
                    {visits.filter(visit => !['home_visit', 'school_visit', 'medical_visit', 'follow_up'].includes(visit.visit_type)).map((visit) => (
                      <Card key={visit.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium">{visit.visit_type}</p>
                                  <p className="text-sm text-muted-foreground">{visit.location}</p>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(visit.visit_date).toLocaleDateString()}
                                </span>
                              </div>
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Documents</h3>
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Document Link</DialogTitle>
                      </DialogHeader>
                      <DocumentLinkForm childId={id} onSuccess={fetchChildData} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {documents.find(doc => doc.category === 'profile') ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => window.open(documents.find(doc => doc.category === 'profile')?.file_url, '_blank')}
                          >
                            View Profile
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this document? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteDocument(documents.find(doc => doc.category === 'profile')?.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No link added</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Consent Form</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {documents.find(doc => doc.category === 'consent_form') ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => window.open(documents.find(doc => doc.category === 'consent_form')?.file_url, '_blank')}
                          >
                            View Consent Form
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this document? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteDocument(documents.find(doc => doc.category === 'consent_form')?.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No link added</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Follow-up Form</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {documents.find(doc => doc.category === 'follow_up') ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => window.open(documents.find(doc => doc.category === 'follow_up')?.file_url, '_blank')}
                          >
                            View Follow-up Form
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this document? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteDocument(documents.find(doc => doc.category === 'follow_up')?.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No link added</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Intake Form</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {documents.find(doc => doc.category === 'intake_form') ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => window.open(documents.find(doc => doc.category === 'intake_form')?.file_url, '_blank')}
                          >
                            View Intake Form
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this document? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteDocument(documents.find(doc => doc.category === 'intake_form')?.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No link added</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {documents.filter(doc => !['profile', 'consent_form', 'follow_up', 'intake_form'].includes(doc.category)).length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-3">Other Documents</h4>
                  <div className="space-y-3">
                    {documents.filter(doc => !['profile', 'consent_form', 'follow_up', 'intake_form'].includes(doc.category)).map((document) => (
                        <Card key={document.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{document.title}</p>
                                {document.description && (
                                  <p className="text-sm text-muted-foreground">{document.description}</p>
                                )}
                                {document.category && (
                                  <Badge variant="outline" className="mt-1">{document.category}</Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(document.file_url, '_blank')}
                                >
                                  View
                                </Button>
                                {isAdmin && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this document? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteDocument(document.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}