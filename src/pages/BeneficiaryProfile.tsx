import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, GraduationCap, UserCheck, UsersRound, Users, Calendar, MapPin, Phone, Mail, Building2, Heart, Loader2, FolderKanban } from 'lucide-react';
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
import { ProgramServicesDisplay } from '@/components/beneficiary/ProgramServicesDisplay';
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
}

export default function BeneficiaryProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        .select('*')
        .eq('beneficiary_id', id);

      if (donorsData) {
        setDonors(donorsData);
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getPastelColor = (id: string) => {
    const pastelColors = [
      'hsl(210, 100%, 92%)',
      'hsl(150, 80%, 90%)',
      'hsl(45, 100%, 90%)',
      'hsl(300, 85%, 92%)',
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return pastelColors[hash % pastelColors.length];
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/beneficiaries')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Beneficiaries
        </Button>
        
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              {beneficiary.photo_url ? (
                <AvatarImage src={beneficiary.photo_url} alt={beneficiary.display_name} />
              ) : null}
              <AvatarFallback 
                className="text-2xl font-bold"
                style={{ backgroundColor: getPastelColor(beneficiary.id) }}
              >
                {getInitials(beneficiary.display_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{beneficiary.display_name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" className="capitalize">
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {beneficiary.beneficiary_type}
                    </Badge>
                    <Badge variant={beneficiary.status === 'active' ? 'default' : 'secondary'}>
                      {beneficiary.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {beneficiary.beneficiary_type !== 'group' && age && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{age} years old</span>
                  </div>
                )}
                {beneficiary.gender && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{beneficiary.gender}</span>
                  </div>
                )}
                {beneficiary.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{beneficiary.location}</span>
                  </div>
                )}
                {beneficiary.institution_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{beneficiary.institution_name}</span>
                  </div>
                )}
                {beneficiary.member_count && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
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
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="services">
            <FolderKanban className="h-4 w-4 mr-1" />
            Services
          </TabsTrigger>
          {beneficiary.beneficiary_type !== 'group' && (
            <TabsTrigger value="guardians">Guardians ({guardians.length})</TabsTrigger>
          )}
          <TabsTrigger value="donors">Donors ({donors.length})</TabsTrigger>
          {beneficiary.beneficiary_type !== 'group' && (
            <TabsTrigger value="medical">Medical</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Student Details */}
          {beneficiary.beneficiary_type === 'student' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Academic Information</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Self-Empowerment Details</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Group Information</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Location/Residence</p>
                <p className="font-medium">{beneficiary.location || '-'}</p>
              </div>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Background</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{beneficiary.background_narrative}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Services/Programs Tab */}
        <TabsContent value="services" className="space-y-4">
          <ProgramServicesDisplay beneficiaryId={beneficiary.id} />
        </TabsContent>

        {beneficiary.beneficiary_type !== 'group' && (
          <TabsContent value="guardians" className="space-y-4">
            {guardians.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No guardians linked to this beneficiary
                </CardContent>
              </Card>
            ) : (
              guardians.map((guardian) => (
                <Card key={guardian.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{guardian.full_name}</h4>
                        <Badge variant="secondary" className="mt-1 capitalize">
                          {guardian.guardian_type} ({guardian.relationship})
                        </Badge>
                      </div>
                      <Badge variant={guardian.is_alive ? 'default' : 'secondary'}>
                        {guardian.is_alive ? 'Alive' : 'Deceased'}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {guardian.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {guardian.phone}
                        </div>
                      )}
                      {guardian.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {guardian.email}
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

        <TabsContent value="donors" className="space-y-4">
          {donors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No donors linked to this beneficiary
              </CardContent>
            </Card>
          ) : (
            donors.map((donor) => (
              <Card key={donor.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Heart className="h-4 w-4 text-primary" />
                        {donor.donor_name}
                      </h4>
                      {donor.donation_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Donated on {new Date(donor.donation_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {donor.amount_received && (
                      <Badge variant="default">
                        KSH {donor.amount_received.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  {donor.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{donor.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {beneficiary.beneficiary_type !== 'group' && (
          <TabsContent value="medical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Medical Information</CardTitle>
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
