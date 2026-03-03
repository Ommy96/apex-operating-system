import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { GuardianForm } from './GuardianForm';
import { CountySelector } from './CountySelector';
import { SiblingSelector } from './SiblingSelector';

import { MedicalInfoSection } from './MedicalInfoSection';
import { BackgroundSection } from './BackgroundSection';
import { User, Users, Heart, FileText, Loader2 } from 'lucide-react';
import { ACADEMIC_LEVEL_GRADE_MAP, ACADEMIC_LEVELS } from '@/lib/academicGradeMapping';

// Guardian data structure
interface GuardianData {
  is_alive?: boolean;
  date_of_death?: string;
  full_name?: string;
  age?: number;
  national_id?: string;
  phone?: string;
  relation?: string;
  employment_type?: string;
  source_of_income?: string;
  employment_details?: string;
}

// Form data type
interface StudentFormData {
  student_id_number?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female';
  photo_url?: string;
  country?: string;
  county?: string;
  sub_county?: string;
  estate_village?: string;
  home_county?: string;
  academic_level?: string;
  institution_name?: string;
  grade?: string;
  course_name?: string;
  year_enrolled?: number;
  father?: GuardianData;
  mother?: GuardianData;
  caregiver?: GuardianData;
  hiv_status?: 'positive' | 'negative' | 'unknown';
  hiv_positive_since?: number;
  has_special_needs?: boolean;
  special_needs_details?: string;
  other_medical_conditions?: string;
  background_narrative?: string;
  hobbies?: string;
  future_ambition?: string;
  religion?: string;
  background_image_url?: string;
  status: string;
}

interface Sibling {
  id: string;
  display_name: string;
  relationship: string;
}



interface StudentBeneficiaryFormProps {
  beneficiary?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StudentBeneficiaryForm({ beneficiary, onSuccess, onCancel }: StudentBeneficiaryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [siblings, setSiblings] = useState<Sibling[]>([]);
  
  const { currentOrganization } = useOrganization();

  // Load existing siblings when editing
  useEffect(() => {
    if (beneficiary?.id) {
      supabase
        .from('beneficiary_siblings')
        .select('sibling_id, relationship, sibling:sibling_id(id, display_name)')
        .eq('beneficiary_id', beneficiary.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSiblings(data.map((s: any) => ({
              id: s.sibling_id,
              display_name: (s.sibling as any)?.display_name || 'Unknown',
              relationship: s.relationship,
            })));
          }
        });
    }
  }, [beneficiary?.id]);

  const form = useForm<StudentFormData>({
    defaultValues: {
      student_id_number: beneficiary?.student_id_number || '',
      first_name: beneficiary?.first_name || '',
      middle_name: beneficiary?.middle_name || '',
      last_name: beneficiary?.last_name || '',
      date_of_birth: beneficiary?.date_of_birth || '',
      gender: beneficiary?.gender || undefined,
      photo_url: beneficiary?.photo_url || '',
      country: beneficiary?.country || 'Kenya',
      county: beneficiary?.county || '',
      sub_county: beneficiary?.sub_county || '',
      estate_village: beneficiary?.estate_village || '',
      home_county: beneficiary?.home_county || '',
      academic_level: beneficiary?.academic_level || undefined,
      institution_name: beneficiary?.institution_name || '',
      grade: beneficiary?.grade || '',
      course_name: beneficiary?.course_name || '',
      year_enrolled: beneficiary?.year_enrolled || new Date().getFullYear(),
      father: { is_alive: true },
      mother: { is_alive: true },
      caregiver: { is_alive: true },
      hiv_status: beneficiary?.hiv_status || undefined,
      hiv_positive_since: beneficiary?.hiv_positive_since || undefined,
      has_special_needs: beneficiary?.has_special_needs || false,
      special_needs_details: beneficiary?.special_needs_details || '',
      other_medical_conditions: beneficiary?.other_medical_conditions || '',
      background_narrative: beneficiary?.background_narrative || '',
      hobbies: beneficiary?.hobbies || '',
      future_ambition: beneficiary?.future_ambition || '',
      religion: beneficiary?.religion || '',
      background_image_url: beneficiary?.background_image_url || '',
      status: beneficiary?.status || 'active',
    },
  });

  const watchedLevel = form.watch('academic_level');
  const gradeOptions = watchedLevel && ACADEMIC_LEVEL_GRADE_MAP[watchedLevel] 
    ? ACADEMIC_LEVEL_GRADE_MAP[watchedLevel].grades 
    : [];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const onSubmit = async (data: StudentFormData) => {
    if (!currentOrganization?.organization_id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Prepare beneficiary data
      const displayName = `${data.first_name} ${data.middle_name || ''} ${data.last_name}`.replace(/\s+/g, ' ').trim();
      
      const beneficiaryData: any = {
        organization_id: currentOrganization.organization_id,
        beneficiary_type: 'student',
        display_name: displayName,
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        photo_url: data.photo_url || null,
        country: data.country || 'Kenya',
        county: data.county || null,
        sub_county: data.sub_county || null,
        estate_village: data.estate_village || null,
        home_county: data.home_county || null,
        academic_level: data.academic_level || null,
        institution_name: data.institution_name || null,
        grade: data.grade || null,
        course_name: data.course_name || null,
        year_enrolled: data.year_enrolled || null,
        hiv_status: data.hiv_status || null,
        hiv_positive_since: data.hiv_positive_since || null,
        has_special_needs: data.has_special_needs || false,
        special_needs_details: data.special_needs_details || null,
        other_medical_conditions: data.other_medical_conditions || null,
        background_narrative: data.background_narrative || null,
        hobbies: data.hobbies || null,
        future_ambition: data.future_ambition || null,
        religion: data.religion || null,
        background_image_url: data.background_image_url || null,
        student_id_number: data.student_id_number || null,
        status: data.status,
        created_by: user?.id,
      };

      let beneficiaryId: string;

      if (beneficiary?.id) {
        // Update existing beneficiary
        const { error } = await supabase
          .from('beneficiaries')
          .update(beneficiaryData)
          .eq('id', beneficiary.id);
        if (error) throw error;
        beneficiaryId = beneficiary.id;
      } else {
        // Create new beneficiary
        const { data: newBeneficiary, error } = await supabase
          .from('beneficiaries')
          .insert([beneficiaryData])
          .select('id')
          .single();
        if (error) throw error;
        beneficiaryId = newBeneficiary.id;
      }

      // Save guardians
      const guardiansToSave = [];
      
      for (const [type, guardian] of Object.entries({ father: data.father, mother: data.mother, caregiver: data.caregiver })) {
        if (guardian && (guardian.full_name || !guardian.is_alive)) {
          guardiansToSave.push({
            organization_id: currentOrganization.organization_id,
            guardian_type: (type === 'caregiver' ? 'other' : type) as 'father' | 'mother' | 'other',
            full_name: guardian.full_name || `Unknown ${type}`,
            is_alive: guardian.is_alive,
            date_of_death: guardian.date_of_death || null,
            age: guardian.age || null,
            national_id: guardian.national_id || null,
            phone: guardian.phone || null,
            employment_type: guardian.employment_type || null,
            source_of_income: guardian.source_of_income || null,
            employment_details: guardian.employment_details || null,
            created_by: user?.id,
          });
        }
      }

      // Delete existing guardian links and insert new ones
      if (beneficiary?.id) {
        await supabase
          .from('beneficiary_guardians')
          .delete()
          .eq('beneficiary_id', beneficiaryId);
      }

      for (const guardianData of guardiansToSave) {
        const { data: savedGuardian, error: guardianError } = await supabase
          .from('guardians')
          .insert([guardianData])
          .select('id')
          .single();

        if (guardianError) throw guardianError;

        // For caregiver, store the relation from the form
        const relationship = guardianData.guardian_type === 'caregiver' 
          ? (data.caregiver?.relation || 'caregiver')
          : guardianData.guardian_type;

        // Link guardian to beneficiary
        await supabase
          .from('beneficiary_guardians')
          .insert([{
            beneficiary_id: beneficiaryId,
            guardian_id: savedGuardian.id,
            relationship: relationship,
            is_primary: guardianData.guardian_type === 'caregiver',
          }]);
      }

      // Save siblings
      // Always delete existing and re-insert
      if (beneficiary?.id) {
        await supabase
          .from('beneficiary_siblings')
          .delete()
          .eq('beneficiary_id', beneficiaryId);
      }

      for (const sibling of siblings) {
        await supabase
          .from('beneficiary_siblings')
          .insert([{
            beneficiary_id: beneficiaryId,
            sibling_id: sibling.id,
            relationship: sibling.relationship,
          }]);
      }

      toast({
        title: "Success",
        description: beneficiary ? "Student beneficiary updated successfully" : "Student beneficiary created successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error saving beneficiary:', error);
      toast({
        title: "Error",
        description: "Failed to save beneficiary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <ScrollArea className="h-[80vh]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="guardians" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Guardians</span>
                </TabsTrigger>
                <TabsTrigger value="medical" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Medical</span>
                </TabsTrigger>
                <TabsTrigger value="background" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Background</span>
                </TabsTrigger>
              </TabsList>

              {/* Personal Details Tab */}
              <TabsContent value="personal" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Basic details about the student</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="student_id_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student ID Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter unique student ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="middle_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Middle name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="graduated">Graduated</SelectItem>
                              <SelectItem value="dropped">Dropped</SelectItem>
                              <SelectItem value="replaced">Replaced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="photo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Photo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/photo.jpg" {...field} />
                          </FormControl>
                          {form.watch('photo_url') && (
                            <div className="flex items-center gap-3 mt-2">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={form.watch('photo_url')} alt="Preview" />
                                <AvatarFallback>
                                  {getInitials(form.watch('first_name'), form.watch('last_name'))}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">Preview</span>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                    <CardDescription>Where the student lives</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CountySelector
                      countryField="country"
                      countyField="county"
                      subCountyField="sub_county"
                      homeCountyField="home_county"
                      estateVillageField="estate_village"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Academic Information</CardTitle>
                    <CardDescription>Education details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="academic_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Academic Level</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Reset grade when level changes
                                const levelConfig = ACADEMIC_LEVEL_GRADE_MAP[value];
                                if (levelConfig && !levelConfig.isFreeText) {
                                  form.setValue('grade', '');
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ACADEMIC_LEVELS.map(level => (
                                  <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="institution_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institution Name</FormLabel>
                            <FormControl>
                              <Input placeholder="School/College name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {watchedLevel && ACADEMIC_LEVEL_GRADE_MAP[watchedLevel]?.isFreeText ? (
                        <FormField
                          control={form.control}
                          name="grade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Enter Grade/Class/Level</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter grade or class" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="grade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grade/Form/Year</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={watchedLevel ? "Select grade" : "Select level first"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {gradeOptions.map(grade => (
                                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {watchedLevel === 'Tertiary' && (
                        <FormField
                          control={form.control}
                          name="course_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Course Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Computer Science" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="year_enrolled"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Enrolled</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 2024"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Siblings Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Siblings</CardTitle>
                    <CardDescription>Link to other students in the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SiblingSelector
                      selectedSiblings={siblings}
                      onChange={setSiblings}
                      excludeId={beneficiary?.id}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Guardians Tab */}
              <TabsContent value="guardians" className="space-y-6 mt-6">
                <Tabs defaultValue="father" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="father">Father</TabsTrigger>
                    <TabsTrigger value="mother">Mother</TabsTrigger>
                    <TabsTrigger value="caregiver">Caregiver</TabsTrigger>
                  </TabsList>
                  <TabsContent value="father" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Father's Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GuardianForm guardianType="father" prefix="father" />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="mother" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Mother's Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GuardianForm guardianType="mother" prefix="mother" />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="caregiver" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Primary Caregiver Information</CardTitle>
                        <CardDescription>The person primarily responsible for the student's care</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <GuardianForm guardianType="caregiver" prefix="caregiver" />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Medical Tab */}
              <TabsContent value="medical" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Medical Information</CardTitle>
                    <CardDescription>Confidential health details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MedicalInfoSection />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Background Tab */}
              <TabsContent value="background" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Background & Story</CardTitle>
                    <CardDescription>Narrative and personal interests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BackgroundSection />
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {beneficiary ? 'Update Student' : 'Create Student'}
              </Button>
            </div>
          </form>
        </Form>
      </ScrollArea>
    </FormProvider>
  );
}
