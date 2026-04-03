import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { MedicalInfoSection } from './MedicalInfoSection';
import { CountySelector } from './CountySelector';
import { DuplicateWarning } from './DuplicateWarning';
import { DependantSelector } from './DependantSelector';
import { User, Briefcase, Heart, Users, Loader2 } from 'lucide-react';

interface AdultFormData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female';
  phone?: string;
  photo_url?: string;
  country?: string;
  county?: string;
  sub_county?: string;
  estate_village?: string;
  home_county?: string;
  // Business/Self-empowerment fields
  source_of_income?: string;
  amount_given?: number;
  // Medical
  hiv_status?: 'positive' | 'negative' | 'unknown';
  hiv_positive_since?: number;
  has_special_needs?: boolean;
  special_needs_details?: string;
  other_medical_conditions?: string;
  // Background
  background_narrative?: string;
  religion?: string;
  status: string;
  funding_required?: number;
}

interface Dependant {
  id: string;
  display_name: string;
  beneficiary_type: string;
  institution_name?: string;
  grade?: string;
}


interface AdultBeneficiaryFormProps {
  beneficiary?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdultBeneficiaryForm({ beneficiary, onSuccess, onCancel }: AdultBeneficiaryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [dependants, setDependants] = useState<Dependant[]>([]);
  
  const { currentOrganization } = useOrganization();

  // Load existing dependants when editing
  useEffect(() => {
    if (beneficiary?.id) {
      supabase
        .from('adult_dependants')
        .select('student_id, student:student_id(id, display_name, beneficiary_type, institution_name, grade)')
        .eq('adult_id', beneficiary.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setDependants(data.map((d: any) => ({
              id: d.student_id,
              display_name: (d.student as any)?.display_name || 'Unknown',
              beneficiary_type: (d.student as any)?.beneficiary_type || 'student',
              institution_name: (d.student as any)?.institution_name || '',
              grade: (d.student as any)?.grade || '',
            })));
          }
        });
    }
  }, [beneficiary?.id]);

  const form = useForm<AdultFormData>({
    defaultValues: {
      first_name: beneficiary?.first_name || '',
      middle_name: beneficiary?.middle_name || '',
      last_name: beneficiary?.last_name || '',
      date_of_birth: beneficiary?.date_of_birth || '',
      gender: beneficiary?.gender || undefined,
      phone: beneficiary?.phone || '',
      photo_url: beneficiary?.photo_url || '',
      country: beneficiary?.country || 'Kenya',
      county: beneficiary?.county || '',
      sub_county: beneficiary?.sub_county || '',
      estate_village: beneficiary?.estate_village || '',
      home_county: beneficiary?.home_county || '',
      source_of_income: beneficiary?.source_of_income || '',
      amount_given: beneficiary?.amount_given || undefined,
      hiv_status: beneficiary?.hiv_status || undefined,
      hiv_positive_since: beneficiary?.hiv_positive_since || undefined,
      has_special_needs: beneficiary?.has_special_needs || false,
      special_needs_details: beneficiary?.special_needs_details || '',
      other_medical_conditions: beneficiary?.other_medical_conditions || '',
      background_narrative: beneficiary?.background_narrative || '',
      religion: beneficiary?.religion || '',
      status: beneficiary?.status || 'active',
      funding_required: beneficiary?.funding_required || undefined,
    },
  });

  const onSubmit = async (data: AdultFormData) => {
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

      const displayName = `${data.first_name} ${data.middle_name || ''} ${data.last_name}`.replace(/\s+/g, ' ').trim();

      const beneficiaryData: any = {
        organization_id: currentOrganization.organization_id,
        beneficiary_type: 'adult',
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
        source_of_income: data.source_of_income || null,
        amount_given: data.amount_given || null,
        hiv_status: data.hiv_status || null,
        hiv_positive_since: data.hiv_positive_since || null,
        has_special_needs: data.has_special_needs || false,
        special_needs_details: data.special_needs_details || null,
        other_medical_conditions: data.other_medical_conditions || null,
        background_narrative: data.background_narrative || null,
        religion: data.religion || null,
        status: data.status,
        funding_required: data.funding_required || 0,
        created_by: user?.id,
      };

      let beneficiaryId: string;

      if (beneficiary?.id) {
        const { error } = await supabase
          .from('beneficiaries')
          .update(beneficiaryData)
          .eq('id', beneficiary.id);
        if (error) throw error;
        beneficiaryId = beneficiary.id;
      } else {
        const { data: newBeneficiary, error } = await supabase
          .from('beneficiaries')
          .insert([beneficiaryData])
          .select('id')
          .single();
        if (error) throw error;
        beneficiaryId = newBeneficiary.id;
      }

      // Save dependants (adult → student links) - always delete and re-insert
      await supabase
        .from('adult_dependants')
        .delete()
        .eq('adult_id', beneficiaryId);

      for (const dep of dependants) {
        await supabase
          .from('adult_dependants')
          .insert([{
            adult_id: beneficiaryId,
            student_id: dep.id,
          }]);
      }


      toast({
        title: "Success",
        description: beneficiary ? "Adult beneficiary updated successfully" : "Adult beneficiary created successfully",
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Business</span>
                </TabsTrigger>
                <TabsTrigger value="medical" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Medical</span>
                </TabsTrigger>
                <TabsTrigger value="dependants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Dependants</span>
                </TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Basic details about the adult beneficiary</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        rules={{ required: 'First name is required' }}
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
                        rules={{ required: 'Last name is required' }}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 0712345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="photo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Photo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Location Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Location Information</CardTitle>
                    <CardDescription>Residence and location details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CountySelector
                      countryField="country"
                      countyField="county"
                      subCountyField="sub_county"
                      homeCountyField="home_county"
                      estateVillageField="estate_village"
                    />
                  </CardContent>
                </Card>

                {/* Status */}
                <Card>
                  <CardContent className="pt-6">
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Business/Self-Empowerment Tab */}
              <TabsContent value="business" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Self-Empowerment / Business</CardTitle>
                    <CardDescription>Income and support information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="source_of_income"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source of Income / Business Type</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the adult's source of income or business activities..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount_given"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Given (KSH)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="funding_required"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Funding Required (KES)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              placeholder="e.g., 50000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="background_narrative"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background Narrative</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional context about the beneficiary's situation..."
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="religion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Religion</FormLabel>
                          <FormControl>
                            <Input placeholder="Religion" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Medical Tab */}
              <TabsContent value="medical" className="space-y-6 mt-6">
                <MedicalInfoSection />
              </TabsContent>

              {/* Dependants Tab */}
              <TabsContent value="dependants" className="space-y-6 mt-6">
                <DependantSelector
                  dependants={dependants}
                  onDependantsChange={setDependants}
                  excludeId={beneficiary?.id}
                />
              </TabsContent>

            </Tabs>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {beneficiary ? 'Update Beneficiary' : 'Create Beneficiary'}
              </Button>
            </div>
          </form>
        </Form>
      </ScrollArea>
    </FormProvider>
  );
}
