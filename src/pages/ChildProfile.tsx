import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit2, 
  FileText, 
  Plus, 
  Trash2, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  GraduationCap, 
  Heart, 
  BookOpen, 
  Home,
  Stethoscope,
  ClipboardList,
  FolderOpen,
  ExternalLink,
  Bus,
  ShoppingCart,
  HeartHandshake
} from 'lucide-react';
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
import { VisitReportLinkForm } from '@/components/VisitReportLinkForm';
import { ProgramEnrollmentForm } from '@/components/ProgramEnrollmentForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { convertGoogleDriveUrl } from '@/lib/imageUtils';
import { StatusReplacementCard } from '@/components/child-profile/StatusReplacementCard';
import { ServicesTab } from '@/components/child-profile/ServicesTab';
import { HomeVisitsTab } from '@/components/child-profile/HomeVisitsTab';
import { AcademicTab } from '@/components/child-profile/AcademicTab';

export default function ChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [child, setChild] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [replacement, setReplacement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchChildData();
    }
  }, [id]);

  const fetchChildData = async () => {
    try {
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('*')
        .eq('id', id)
        .single();

      if (childError) throw childError;
      setChild(childData);

      const { data: programsData, error: programsError } = await supabase
        .from('child_programs')
        .select(`
          *,
          programs:program_id (name, description)
        `)
        .eq('child_id', id);

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('child_id', id)
        .order('visit_date', { ascending: false });

      if (visitsError) throw visitsError;
      setVisits(visitsData || []);

      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('child_id', id)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      // Fetch replacement data if this child has been replaced
      const { data: replacementData } = await supabase
        .from('replacements')
        .select('*')
        .eq('original_child_id', id)
        .maybeSingle();
      
      setReplacement(replacementData);

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
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

  const InfoItem = ({ icon: Icon, label, value, colorClass = "text-accent" }: { icon: any, label: string, value: string | null | undefined, colorClass?: string }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors">
      <div className={`p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value || 'Not specified'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Hero Header with Profile */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-primary via-primary-light to-accent p-4 md:p-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:20px_20px]"></div>
        
        <div className="relative z-10">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/children')}
            className="mb-3 md:mb-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 text-sm"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
            {/* Large Profile Picture */}
            <div className="relative group flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent via-accent-light to-accent rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <Avatar className="relative h-24 w-24 md:h-44 md:w-44 border-4 border-primary-foreground/20 shadow-2xl">
                {child.photo_url ? (
                  <AvatarImage 
                    src={convertGoogleDriveUrl(child.photo_url) || undefined} 
                    alt={`${child.first_name} ${child.last_name}`} 
                    className="object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : null}
                <AvatarFallback className="text-2xl md:text-5xl font-bold bg-gradient-to-br from-accent to-accent-dark text-primary-foreground">
                  {getInitials(child.first_name, child.last_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Name and Quick Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-xl md:text-4xl font-bold text-primary-foreground mb-2 truncate">
                {child.first_name} {child.last_name}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mb-3 md:mb-4">
                <Badge 
                  className={`text-xs md:text-sm px-2.5 md:px-4 py-1 md:py-1.5 font-semibold ${
                    child.status === 'active' 
                      ? 'bg-success/90 hover:bg-success text-success-foreground' 
                      : 'bg-warning/90 hover:bg-warning text-warning-foreground'
                  }`}
                >
                  {child.status?.charAt(0).toUpperCase() + child.status?.slice(1)}
                </Badge>
                {child.gender && (
                  <Badge variant="outline" className="text-xs md:text-sm text-primary-foreground/90 border-primary-foreground/30 bg-primary-foreground/10">
                    {child.gender}
                  </Badge>
                )}
                {child.date_of_birth && (
                  <Badge variant="outline" className="text-xs md:text-sm text-primary-foreground/90 border-primary-foreground/30 bg-primary-foreground/10">
                    Age {calculateAge(child.date_of_birth)}
                  </Badge>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-primary-foreground/80">
                {child.residence && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="text-xs md:text-sm">{child.residence}</span>
                  </div>
                )}
                {child.academic_level && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{child.academic_level}</span>
                  </div>
                )}
                {child.institution_name && (
                  <div className="hidden sm:flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="text-xs md:text-sm truncate max-w-[150px]">{child.institution_name}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto flex-shrink-0">
              {isAdmin && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex-1 md:flex-none bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 text-xs md:text-sm">
                      <Edit2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
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
              <Button 
                onClick={() => navigate(`/children/${id}/report`)}
                size="sm"
                className="flex-1 md:flex-none bg-accent hover:bg-accent-dark text-accent-foreground shadow-lg text-xs md:text-sm"
              >
                <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Key Information Cards */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal Information Card */}
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-secondary/20">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-accent" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4">
              <InfoItem 
                icon={Calendar} 
                label="Date of Birth" 
                value={child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null}
              />
              <InfoItem 
                icon={Calendar} 
                label="Enrollment Date" 
                value={new Date(child.enrollment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              />
              <InfoItem 
                icon={MapPin} 
                label="Residence" 
                value={child.residence}
              />
              <InfoItem 
                icon={Heart} 
                label="Parental Status" 
                value={child.parental_status}
              />
            </CardContent>
          </Card>

          {/* Education Card */}
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-secondary/20">
            <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-success" />
                Education Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4">
              <InfoItem 
                icon={BookOpen} 
                label="Academic Level" 
                value={child.academic_level}
                colorClass="text-success"
              />
              <InfoItem 
                icon={GraduationCap} 
                label="Grade" 
                value={child.grade}
                colorClass="text-success"
              />
              <InfoItem 
                icon={BookOpen} 
                label="Institution" 
                value={child.institution_name}
                colorClass="text-success"
              />
              {child.course_name && (
                <InfoItem 
                  icon={BookOpen} 
                  label="Course" 
                  value={child.course_name}
                  colorClass="text-success"
                />
              )}
              <InfoItem 
                icon={User} 
                label="Student ID" 
                value={child.student_id}
                colorClass="text-success"
              />
            </CardContent>
          </Card>

          {/* Guardian Card */}
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-secondary/20">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5 text-purple-500" />
                Guardian Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4">
              <InfoItem 
                icon={User} 
                label="Guardian Name" 
                value={child.guardian_name}
                colorClass="text-purple-500"
              />
              <InfoItem 
                icon={Phone} 
                label="Guardian Phone" 
                value={child.guardian_phone}
                colorClass="text-purple-500"
              />
              <InfoItem 
                icon={User} 
                label="Relation" 
                value={child.relation}
                colorClass="text-purple-500"
              />
            </CardContent>
          </Card>

          {/* Sponsor Card */}
          {(child.donor || child.donation_received_ksh) && (
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-secondary/20">
              <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-orange-500" />
                  Sponsorship
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 pt-4">
                <InfoItem 
                  icon={User} 
                  label="Donor" 
                  value={child.donor}
                  colorClass="text-orange-500"
                />
                {child.donation_received_ksh && (
                  <InfoItem 
                    icon={Heart} 
                    label="Donation Received" 
                    value={`KSH ${child.donation_received_ksh.toLocaleString()}`}
                    colorClass="text-orange-500"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Medical & Special Needs Card */}
          {(child.medical_notes || child.special_needs || child.special_condition) && (
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-secondary/20">
              <CardHeader className="pb-3 bg-gradient-to-r from-rose-500/10 to-red-500/10">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stethoscope className="h-5 w-5 text-destructive" />
                  Medical & Special Needs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {child.medical_notes && (
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                    <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">Medical Notes</p>
                    <p className="text-sm text-foreground">{child.medical_notes}</p>
                  </div>
                )}
                {child.special_needs && (
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                    <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">Special Needs</p>
                    <p className="text-sm text-foreground">{child.special_needs}</p>
                  </div>
                )}
                {child.special_condition && (
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                    <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">Special Condition</p>
                    <p className="text-sm text-foreground">{child.special_condition}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status & Replacement Card */}
          <StatusReplacementCard 
            child={child} 
            replacement={replacement} 
            isAdmin={isAdmin} 
            onRefresh={fetchChildData} 
          />
        </div>

        {/* Right Column - Tabs Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="programs" className="space-y-4">
            <TabsList className="w-full justify-start bg-card/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="programs" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <GraduationCap className="h-4 w-4" />
                Programs
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <HeartHandshake className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger value="home-visits" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Home className="h-4 w-4" />
                Home Visits
              </TabsTrigger>
              <TabsTrigger value="academic" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <BookOpen className="h-4 w-4" />
                Academic
              </TabsTrigger>
              <TabsTrigger value="visits" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <ClipboardList className="h-4 w-4" />
                Other Reports
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <FolderOpen className="h-4 w-4" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* Programs Tab */}
            <TabsContent value="programs" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold">Enrolled Programs</h3>
                  <p className="text-muted-foreground text-sm">{programs.length} program{programs.length !== 1 ? 's' : ''} enrolled</p>
                </div>
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-accent to-accent-dark text-accent-foreground shadow-lg hover:shadow-xl transition-shadow">
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
                <Card className="border-dashed border-2 bg-secondary/20">
                  <CardContent className="text-center py-12">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground font-medium">No programs enrolled yet</p>
                    <p className="text-sm text-muted-foreground/70">Enroll this child in a program to get started</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {programs.map((program, index) => {
                    const colors = [
                      'from-blue-500/10 to-cyan-500/10 border-blue-200',
                      'from-emerald-500/10 to-green-500/10 border-emerald-200',
                      'from-purple-500/10 to-pink-500/10 border-purple-200',
                      'from-orange-500/10 to-amber-500/10 border-orange-200',
                    ];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <Card key={program.id} className={`border bg-gradient-to-r ${colorClass} shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{program.programs?.name}</CardTitle>
                              <CardDescription>{program.programs?.description}</CardDescription>
                            </div>
                            <Badge 
                              className={`${
                                program.status === 'active' 
                                  ? 'bg-success text-success-foreground' 
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                            >
                              {program.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              Enrolled: {new Date(program.enrollment_date).toLocaleDateString()}
                            </div>
                            {program.completion_date && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                Completed: {new Date(program.completion_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {program.notes && (
                            <p className="mt-3 text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{program.notes}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-4">
              <ServicesTab child={child} isAdmin={isAdmin} onRefresh={fetchChildData} />
            </TabsContent>

            {/* Home Visits Tab */}
            <TabsContent value="home-visits" className="space-y-4">
              <HomeVisitsTab childId={id!} isAdmin={isAdmin} />
            </TabsContent>

            {/* Academic Performance Tab */}
            <TabsContent value="academic" className="space-y-4">
              <AcademicTab childId={id!} />
            </TabsContent>

            {/* Other Visits Tab */}
            <TabsContent value="visits" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold">Other Visit Reports</h3>
                  <p className="text-muted-foreground text-sm">School and medical visit report links</p>
                </div>
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-accent to-accent-dark text-accent-foreground shadow-lg hover:shadow-xl transition-shadow">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Report Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Visit Report Link</DialogTitle>
                      </DialogHeader>
                      <VisitReportLinkForm childId={id} onSuccess={fetchChildData} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* School Visit Report */}
                <ReportCard 
                  title="School Visit Report"
                  icon={GraduationCap}
                  colorClass="from-emerald-500/10 to-emerald-600/10 border-emerald-200"
                  iconColorClass="text-emerald-500 bg-emerald-500/10"
                  document={documents.find(doc => doc.category === 'school_visit_report')}
                  onDelete={handleDeleteDocument}
                  isAdmin={isAdmin}
                />
                
                {/* Medical Visit Report */}
                <ReportCard 
                  title="Medical Visit Report"
                  icon={Stethoscope}
                  colorClass="from-rose-500/10 to-rose-600/10 border-rose-200"
                  iconColorClass="text-rose-500 bg-rose-500/10"
                  document={documents.find(doc => doc.category === 'medical_visit_report')}
                  onDelete={handleDeleteDocument}
                  isAdmin={isAdmin}
                />
                
                {/* Follow-up Visit Report */}
                <ReportCard 
                  title="Follow-up Visit Report"
                  icon={ClipboardList}
                  colorClass="from-purple-500/10 to-purple-600/10 border-purple-200"
                  iconColorClass="text-purple-500 bg-purple-500/10"
                  document={documents.find(doc => doc.category === 'follow_up_visit_report')}
                  onDelete={handleDeleteDocument}
                  isAdmin={isAdmin}
                />
              </div>

              {/* Other Visit Reports */}
              {documents.filter(doc => doc.category === 'other_visit_report').length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">Other Visit Reports</h4>
                  <div className="grid gap-3">
                    {documents.filter(doc => doc.category === 'other_visit_report').map((document) => (
                      <Card key={document.id} className="bg-gradient-to-r from-secondary/50 to-secondary/30 border shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{document.title}</p>
                              {document.description && (
                                <p className="text-sm text-muted-foreground">{document.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(document.file_url, '_blank')}
                                className="hover:bg-accent hover:text-accent-foreground"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {isAdmin && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Report Link</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this report link? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteDocument(document.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold">Documents</h3>
                  <p className="text-muted-foreground text-sm">Important files and records</p>
                </div>
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-accent to-accent-dark text-accent-foreground shadow-lg hover:shadow-xl transition-shadow">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Document */}
                <DocumentCard 
                  title="Profile"
                  icon={User}
                  colorClass="from-blue-500/10 to-blue-600/10 border-blue-200"
                  iconColorClass="text-blue-500 bg-blue-500/10"
                  document={documents.find(doc => doc.category === 'profile')}
                  onDelete={handleDeleteDocument}
                  isAdmin={isAdmin}
                />
                
                {/* Consent Form */}
                <DocumentCard 
                  title="Consent Form"
                  icon={FileText}
                  colorClass="from-emerald-500/10 to-emerald-600/10 border-emerald-200"
                  iconColorClass="text-emerald-500 bg-emerald-500/10"
                  document={documents.find(doc => doc.category === 'consent_form')}
                  onDelete={handleDeleteDocument}
                  isAdmin={isAdmin}
                />
                
                {/* Follow-up Form */}
                <DocumentCard 
                  title="Follow-up Form"
                  icon={ClipboardList}
                  colorClass="from-purple-500/10 to-purple-600/10 border-purple-200"
                  iconColorClass="text-purple-500 bg-purple-500/10"
                  document={documents.find(doc => doc.category === 'follow_up_form')}
                  onDelete={handleDeleteDocument}
                  isAdmin={isAdmin}
                />
                
                {/* Report Cards */}
                <DocumentCard 
                  title="Report Cards"
                  icon={GraduationCap}
                  colorClass="from-orange-500/10 to-orange-600/10 border-orange-200"
                  iconColorClass="text-orange-500 bg-orange-500/10"
                  document={documents.find(doc => doc.category === 'report_cards')}
                  onDelete={handleDeleteDocument}
                  isAdmin={isAdmin}
                />
              </div>

              {/* Other Documents */}
              {documents.filter(doc => doc.category === 'other').length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">Other Documents</h4>
                  <div className="grid gap-3">
                    {documents.filter(doc => doc.category === 'other').map((document) => (
                      <Card key={document.id} className="bg-gradient-to-r from-secondary/50 to-secondary/30 border shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{document.title}</p>
                              {document.description && (
                                <p className="text-sm text-muted-foreground">{document.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(document.file_url, '_blank')}
                                className="hover:bg-accent hover:text-accent-foreground"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {isAdmin && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
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
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

// Reusable Report Card Component
function ReportCard({ 
  title, 
  icon: Icon, 
  colorClass, 
  iconColorClass, 
  document, 
  onDelete, 
  isAdmin 
}: { 
  title: string;
  icon: any;
  colorClass: string;
  iconColorClass: string;
  document: any;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}) {
  return (
    <Card className={`bg-gradient-to-r ${colorClass} border shadow-md hover:shadow-lg transition-all`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`p-2 rounded-lg ${iconColorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {document ? (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 hover:bg-accent hover:text-accent-foreground"
              onClick={() => window.open(document.file_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Report
            </Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Report Link</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this report link? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(document.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No report added</p>
        )}
      </CardContent>
    </Card>
  );
}

// Reusable Document Card Component
function DocumentCard({ 
  title, 
  icon: Icon, 
  colorClass, 
  iconColorClass, 
  document, 
  onDelete, 
  isAdmin 
}: { 
  title: string;
  icon: any;
  colorClass: string;
  iconColorClass: string;
  document: any;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}) {
  return (
    <Card className={`bg-gradient-to-r ${colorClass} border shadow-md hover:shadow-lg transition-all`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`p-2 rounded-lg ${iconColorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {document ? (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 hover:bg-accent hover:text-accent-foreground"
              onClick={() => window.open(document.file_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Document
            </Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
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
                      onClick={() => onDelete(document.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No document added</p>
        )}
      </CardContent>
    </Card>
  );
}
