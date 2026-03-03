import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, GraduationCap, UserCheck, UsersRound, Users, Calendar, MapPin, Phone, Mail, Building2, Heart, Loader2, FolderKanban, MessageSquare, FileText, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BeneficiaryEnrollmentForm } from '@/components/beneficiary/BeneficiaryEnrollmentForm';
import { BeneficiaryAcademicsTab } from '@/components/beneficiary/BeneficiaryAcademicsTab';
import { BeneficiaryUploadsTab } from '@/components/beneficiary/BeneficiaryUploadsTab';
import { ProgramObservations } from '@/components/programs/ProgramObservations';
import { generateBeneficiaryReport } from '@/lib/beneficiaryReportGenerator';
import { AcademicProgressionInfo } from '@/components/beneficiary/AcademicProgressionInfo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Beneficiary {
  id: string;
  beneficiary_type: 'student' | 'adult' | 'group';
  display_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  group_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url: string | null;
  status: string;
  location: string | null;
  county: string | null;
  sub_county: string | null;
  estate_village: string | null;
  home_county: string | null;
  academic_level: string | null;
  grade: string | null;
  institution_name: string | null;
  course_name: string | null;
  student_id_number: string | null;
  year_enrolled: number | null;
  member_count: number | null;
  group_schedule: string | null;
  group_activities: string[] | null;
  leader_name: string | null;
  leader_phone: string | null;
  source_of_income: string | null;
  amount_given: number | null;
  hiv_status: string | null;
  hiv_positive_since: number | null;
  has_special_needs: boolean | null;
  special_needs_details: string | null;
  other_medical_conditions: string | null;
  hobbies: string | null;
  future_ambition: string | null;
  religion: string | null;
  background_narrative: string | null;
  background_image_url: string | null;
  inactive_date: string | null;
  inactive_reason: string | null;
  created_at: string;
}

interface Guardian {
  id: string;
  full_name: string;
  guardian_type: string;
  phone: string | null;
  email: string | null;
  is_alive: boolean | null;
  employment_type: string | null;
  source_of_income: string | null;
  relationship: string;
}

interface Donor {
  id: string;
  donor_name: string;
  amount_received: number | null;
  donation_date: string | null;
  notes: string | null;
  program_id: string | null;
  program?: { name: string } | null;
}

interface AcademicRecord {
  id: string;
  academic_year: number;
  term: string;
  overall_grade: string | null;
  total_marks: number | null;
  out_of: number | null;
  position: number | null;
  remarks: string | null;
}

export default function BeneficiaryProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [academics, setAcademics] = useState<AcademicRecord[]>([]);
  const [dependants, setDependants] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (id && currentOrganization?.organization_id) {
      fetchBeneficiaryData();
    }
  }, [id, currentOrganization?.organization_id]);

  const fetchBeneficiaryData = async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      // Fetch beneficiary
      const { data: beneficiaryData, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', id)
        .single();

      if (beneficiaryError) throw beneficiaryError;
      setBeneficiary(beneficiaryData as Beneficiary);

      // Fetch guardians
      const { data: guardiansData } = await supabase
        .from('beneficiary_guardians')
        .select(`
          id,
          relationship,
          guardians (
            id,
            full_name,
            guardian_type,
            phone,
            email,
            is_alive,
            employment_type,
            source_of_income
          )
        `)
        .eq('beneficiary_id', id);

      if (guardiansData) {
        setGuardians(guardiansData.map((g: any) => ({
          ...g.guardians,
          relationship: g.relationship
        })));
      }

      // Fetch donors
      const { data: donorsData } = await supabase
        .from('beneficiary_donors')
        .select('*, program:programs(name)')
        .eq('beneficiary_id', id);

      if (donorsData) {
        setDonors(donorsData);
      }

      // Fetch academic records and siblings (for students)
      if (beneficiaryData.beneficiary_type === 'student') {
        const { data: academicsData } = await supabase
          .from('beneficiary_academics')
          .select('*')
          .eq('beneficiary_id', id)
          .order('academic_year', { ascending: false })
          .order('term', { ascending: false });

        if (academicsData) {
          setAcademics(academicsData);
        }

        // Fetch siblings
        const { data: siblingsData } = await supabase
          .from('beneficiary_siblings')
          .select('*, sibling:sibling_id(id, display_name, beneficiary_type, gender, status, photo_url, institution_name, grade)')
          .eq('beneficiary_id', id);

        if (siblingsData) {
          setSiblings(siblingsData.map((s: any) => ({ ...s.sibling, relationship: s.relationship })));
        }
      }

      // Fetch dependants (for adults)
      if (beneficiaryData.beneficiary_type === 'adult') {
        const { data: dependantsData } = await supabase
          .from('adult_dependants')
          .select('*, student:student_id(id, display_name, beneficiary_type, gender, status, photo_url, institution_name, grade)')
          .eq('adult_id', id);

        if (dependantsData) {
          setDependants(dependantsData.map((d: any) => d.student).filter(Boolean));
        }
      }
    } catch (error) {
      console.error('Error fetching beneficiary:', error);
      toast({
        title: "Error",
        description: "Failed to load beneficiary details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Beneficiary deleted successfully",
      });
      navigate('/beneficiaries');
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      toast({
        title: "Error",
        description: "Failed to delete beneficiary",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    if (!beneficiary) return;
    navigate(`/beneficiaries?edit=${beneficiary.id}&type=${beneficiary.beneficiary_type}`);
  };

  const handleDownloadReport = async () => {
    if (!beneficiary) return;
    
    setGeneratingReport(true);
    try {
      await generateBeneficiaryReport({
        beneficiary,
        guardians,
        donors,
        academics,
        organizationName: currentOrganization?.organization_name || 'Organization',
      });
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'student': return GraduationCap;
      case 'adult': return UserCheck;
      case 'group': return UsersRound;
      default: return Users;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'student': return 'bg-primary/20 text-primary border-primary/30';
      case 'adult': return 'bg-info/20 text-info border-info/30';
      case 'group': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-success/20 text-success border-success/30';
      case 'inactive': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'graduated': return 'bg-info/20 text-info border-info/30';
      case 'dropped': return 'bg-warning/20 text-warning border-warning/30';
      case 'replaced': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Beneficiary not found</h3>
        <Button variant="outline" onClick={() => navigate('/beneficiaries')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Beneficiaries
        </Button>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(beneficiary.beneficiary_type);
  const age = calculateAge(beneficiary.date_of_birth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/beneficiaries')} className="hover:bg-primary/10 self-start">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadReport}
            disabled={generatingReport}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            {generatingReport ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            <span className="hidden sm:inline">Download</span> Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit} className="border-info/30 text-info hover:bg-info/10">
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden border-primary/20">
        <div className="h-2 bg-gradient-to-r from-primary via-info to-primary" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-lg">
              {beneficiary.photo_url ? (
                <AvatarImage src={beneficiary.photo_url} alt={beneficiary.display_name} />
              ) : null}
              <AvatarFallback 
                className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-info/20 text-primary"
              >
                {getInitials(beneficiary.display_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{beneficiary.display_name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`capitalize ${getTypeBadgeColor(beneficiary.beneficiary_type)}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {beneficiary.beneficiary_type}
                    </Badge>
                    <Badge className={getStatusBadgeColor(beneficiary.status)}>
                      {beneficiary.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {beneficiary.beneficiary_type !== 'group' && age && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{age} years old</span>
                  </div>
                )}
                {beneficiary.gender && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-info" />
                    <span>{beneficiary.gender}</span>
                  </div>
                )}
                {beneficiary.institution_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 text-warning" />
                    <span>{beneficiary.institution_name}</span>
                  </div>
                )}
                {beneficiary.member_count && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{beneficiary.member_count} members</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="details" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto md:flex-wrap bg-muted/50 p-1 min-w-full md:min-w-0">
            <TabsTrigger value="details" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
              Details
            </TabsTrigger>
            <TabsTrigger value="programs" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
              <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="observations" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              Observations
            </TabsTrigger>
            {beneficiary.beneficiary_type === 'student' && (
              <TabsTrigger value="academics" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Academics
              </TabsTrigger>
            )}
            {beneficiary.beneficiary_type === 'student' && (
              <TabsTrigger value="uploads" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Uploads
              </TabsTrigger>
            )}
            {beneficiary.beneficiary_type === 'student' && (
              <TabsTrigger value="siblings" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Siblings ({siblings.length})
              </TabsTrigger>
            )}
            {beneficiary.beneficiary_type === 'student' && (
              <TabsTrigger value="guardians" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                Guardians ({guardians.length})
              </TabsTrigger>
            )}
            {beneficiary.beneficiary_type === 'adult' && (
              <TabsTrigger value="dependants" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Dependants ({dependants.length})
              </TabsTrigger>
            )}
            {beneficiary.beneficiary_type !== 'group' && (
              <TabsTrigger value="medical" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                Medical
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="details" className="space-y-4">
          {/* Student Details */}
          {beneficiary.beneficiary_type === 'student' && (
            <Card className="border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Academic Level</p>
                  <p className="font-medium">{beneficiary.academic_level || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grade/Year</p>
                  <p className="font-medium">{beneficiary.grade || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Institution</p>
                  <p className="font-medium">{beneficiary.institution_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-medium">{beneficiary.course_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-medium">{beneficiary.student_id_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year Enrolled</p>
                  <p className="font-medium">{beneficiary.year_enrolled || '-'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adult Details */}
          {beneficiary.beneficiary_type === 'adult' && (
            <Card className="border-info/20">
              <CardHeader className="bg-gradient-to-r from-info/5 to-transparent">
                <CardTitle className="text-lg text-info flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Self-Empowerment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Source of Income</p>
                  <p className="font-medium">{beneficiary.source_of_income || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Given (KSH)</p>
                  <p className="font-medium">{beneficiary.amount_given?.toLocaleString() || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">County</p>
                  <p className="font-medium">{beneficiary.county || '-'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Group Details */}
          {beneficiary.beneficiary_type === 'group' && (
            <Card className="border-warning/20">
              <CardHeader className="bg-gradient-to-r from-warning/5 to-transparent">
                <CardTitle className="text-lg text-warning flex items-center gap-2">
                  <UsersRound className="h-5 w-5" />
                  Group Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Member Count</p>
                  <p className="font-medium">{beneficiary.member_count || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meeting Schedule</p>
                  <p className="font-medium">{beneficiary.group_schedule || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leader Name</p>
                  <p className="font-medium">{beneficiary.leader_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leader Phone</p>
                  <p className="font-medium">{beneficiary.leader_phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Activities</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {beneficiary.group_activities?.map((activity, i) => (
                      <Badge key={i} variant="secondary">{activity}</Badge>
                    )) || <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Details */}
          <Card className="border-success/20">
            <CardHeader className="bg-gradient-to-r from-success/5 to-transparent">
              <CardTitle className="text-lg text-success flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">County</p>
                <p className="font-medium">{beneficiary.county || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sub-County</p>
                <p className="font-medium">{beneficiary.sub_county || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estate/Village</p>
                <p className="font-medium">{beneficiary.estate_village || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Home County</p>
                <p className="font-medium">{beneficiary.home_county || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Background */}
          {beneficiary.background_narrative && (
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-lg">Background</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{beneficiary.background_narrative}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4">
          <BeneficiaryEnrollmentForm beneficiaryId={beneficiary.id} />
        </TabsContent>

        {/* Observations Tab */}
        <TabsContent value="observations" className="space-y-4">
          <ProgramObservations beneficiaryId={beneficiary.id} />
        </TabsContent>

        {/* Academics Tab (Students Only) */}
        {beneficiary.beneficiary_type === 'student' && (
          <TabsContent value="academics" className="space-y-4">
            <AcademicProgressionInfo 
              beneficiaryId={beneficiary.id}
              currentGrade={beneficiary.grade}
              currentLevel={beneficiary.academic_level}
              status={beneficiary.status}
            />
            <BeneficiaryAcademicsTab beneficiaryId={beneficiary.id} />
          </TabsContent>
        )}

        {/* Uploads Tab (Students Only) */}
        {beneficiary.beneficiary_type === 'student' && (
          <TabsContent value="uploads" className="space-y-4">
            <BeneficiaryUploadsTab beneficiaryId={beneficiary.id} />
          </TabsContent>
        )}

        {/* Siblings Tab (Students Only) */}
        {beneficiary.beneficiary_type === 'student' && (
          <TabsContent value="siblings" className="space-y-4">
            {siblings.length === 0 ? (
              <Card className="border-muted">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No siblings linked to this beneficiary
                </CardContent>
              </Card>
            ) : (
              siblings.map((sibling) => (
                <Card key={sibling.id} className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/beneficiaries/${sibling.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        {sibling.photo_url ? <AvatarImage src={sibling.photo_url} /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(sibling.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{sibling.display_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">{sibling.relationship}</Badge>
                          {sibling.institution_name && (
                            <span className="text-xs text-muted-foreground">{sibling.institution_name}</span>
                          )}
                          {sibling.grade && (
                            <span className="text-xs text-muted-foreground">Grade {sibling.grade}</span>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusBadgeColor(sibling.status || 'active')}>{sibling.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* Guardians Tab (Students Only) */}
        {beneficiary.beneficiary_type === 'student' && (
          <TabsContent value="guardians" className="space-y-4">
            {guardians.length === 0 ? (
              <Card className="border-muted">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No guardians linked to this beneficiary
                </CardContent>
              </Card>
            ) : (
              guardians.map((guardian) => (
                <Card key={guardian.id} className="border-primary/10 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{guardian.full_name}</h4>
                        <Badge variant="secondary" className="mt-1 capitalize bg-primary/10 text-primary">
                          {guardian.guardian_type} ({guardian.relationship})
                        </Badge>
                      </div>
                      <Badge className={guardian.is_alive ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}>
                        {guardian.is_alive ? 'Alive' : 'Deceased'}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {guardian.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          {guardian.phone}
                        </div>
                      )}
                      {guardian.employment_type && (
                        <div>
                          <span className="text-muted-foreground">Employment:</span> {guardian.employment_type}
                        </div>
                      )}
                      {guardian.source_of_income && (
                        <div>
                          <span className="text-muted-foreground">Income:</span> {guardian.source_of_income}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* Dependants Tab (Adults Only) */}
        {beneficiary.beneficiary_type === 'adult' && (
          <TabsContent value="dependants" className="space-y-4">
            {dependants.length === 0 ? (
              <Card className="border-muted">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No dependants linked to this beneficiary
                </CardContent>
              </Card>
            ) : (
              dependants.map((dep) => (
                <Card key={dep.id} className="border-info/10 hover:border-info/30 transition-colors cursor-pointer" onClick={() => navigate(`/beneficiaries/${dep.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-info/20">
                        {dep.photo_url ? <AvatarImage src={dep.photo_url} /> : null}
                        <AvatarFallback className="bg-info/10 text-info text-sm">
                          {getInitials(dep.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{dep.display_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {dep.institution_name && (
                            <span className="text-xs text-muted-foreground">{dep.institution_name}</span>
                          )}
                          {dep.grade && (
                            <span className="text-xs text-muted-foreground">Grade {dep.grade}</span>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusBadgeColor(dep.status || 'active')}>{dep.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {beneficiary.beneficiary_type !== 'group' && (
          <TabsContent value="medical" className="space-y-4">
            <Card className="border-destructive/20">
              <CardHeader className="bg-gradient-to-r from-destructive/5 to-transparent">
                <CardTitle className="text-lg text-destructive">Medical Information</CardTitle>
                <CardDescription>Confidential health records</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">HIV Status</p>
                  <p className="font-medium">{beneficiary.hiv_status || '-'}</p>
                </div>
                {beneficiary.hiv_positive_since && (
                  <div>
                    <p className="text-sm text-muted-foreground">HIV Positive Since</p>
                    <p className="font-medium">{beneficiary.hiv_positive_since}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Special Needs</p>
                  <p className="font-medium">{beneficiary.has_special_needs ? 'Yes' : 'No'}</p>
                </div>
                {beneficiary.special_needs_details && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Special Needs Details</p>
                    <p className="font-medium">{beneficiary.special_needs_details}</p>
                  </div>
                )}
                {beneficiary.other_medical_conditions && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Other Medical Conditions</p>
                    <p className="font-medium">{beneficiary.other_medical_conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {beneficiary.display_name}? This action cannot be undone and will remove all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
