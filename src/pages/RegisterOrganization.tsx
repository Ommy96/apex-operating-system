import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Building2, User, Mail, Lock, Phone, Globe, MapPin, Sparkles, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const organizationSchema = z.object({
  // Organization details
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  organizationSlug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  country: z.string().optional(),
  
  // Admin user details
  adminFullName: z.string().min(2, 'Full name must be at least 2 characters'),
  adminEmail: z.string().email('Please enter a valid email'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function RegisterOrganization() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleBackOrSignOut = async () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    // If user is logged in (but has no org), sign them out first
    if (user) {
      try {
        await signOut();
        // Small delay to ensure auth state is fully cleared before navigation
        setTimeout(() => {
          navigate('/auth');
        }, 100);
      } catch (error) {
        console.error('Sign out error:', error);
        // Navigate anyway even if signOut fails
        navigate('/auth');
      }
    } else {
      navigate('/auth');
    }
  };

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: '',
      organizationSlug: '',
      description: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      country: '',
      adminFullName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleOrganizationNameChange = (value: string) => {
    form.setValue('organizationName', value);
    const currentSlug = form.getValues('organizationSlug');
    // Only auto-generate if slug hasn't been manually modified
    if (!currentSlug || currentSlug === generateSlug(form.getValues('organizationName').slice(0, -1))) {
      form.setValue('organizationSlug', generateSlug(value));
    }
  };

  const handleSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    
    try {
      // Step 1: Check if slug is unique
      const { data: existingOrg, error: slugError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', data.organizationSlug)
        .maybeSingle();

      if (slugError) throw slugError;
      
      if (existingOrg) {
        form.setError('organizationSlug', { message: 'This organization URL is already taken' });
        setIsLoading(false);
        return;
      }

      // Step 2: Create the user account
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.adminFullName,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          form.setError('adminEmail', { message: 'This email is already registered. Please sign in instead.' });
        } else {
          throw authError;
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 3: Create the organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.organizationName,
          slug: data.organizationSlug,
          description: data.description || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          address: data.address || null,
          country: data.country || null,
          is_active: true,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Step 4: Add user as admin member of the organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: authData.user.id,
          organization_id: newOrg.id,
          role: 'admin',
          is_primary: true,
        });

      if (memberError) throw memberError;

      // Step 5: Update user profile with organization and admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: newOrg.id,
          role: 'admin',
        })
        .eq('user_id', authData.user.id);

      if (profileError) throw profileError;

      // Step 6: Add admin role to user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: authData.user.id,
          role: 'admin',
          granted_at: new Date().toISOString(),
        });

      if (roleError) throw roleError;

      setRegistrationComplete(true);
      toast.success('Organization registered successfully!');

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register organization');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToStep2 = () => {
    const values = form.getValues();
    return values.organizationName.length >= 2 && 
           values.organizationSlug.length >= 3 &&
           /^[a-z0-9-]+$/.test(values.organizationSlug);
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-background/80 backdrop-blur-xl">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Registration Complete!</CardTitle>
            <CardDescription className="text-base">
              Your organization has been created successfully. Please check your email to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent"
            >
              Go to Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              After verifying your email, sign in to access your organization dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-2xl relative z-10 border-0 shadow-2xl bg-background/80 backdrop-blur-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        
        <CardHeader className="text-center pt-8 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-6 text-muted-foreground hover:text-foreground"
            onClick={handleBackOrSignOut}
          >
            {step === 1 && user ? (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out & Back
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {step === 1 ? 'Back to Sign In' : 'Back'}
              </>
            )}
          </Button>
          
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-xl opacity-50" />
              <div className="relative p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Register Your Organization
          </CardTitle>
          <CardDescription>
            Create a new organization and set up your admin account
          </CardDescription>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <Building2 className="h-4 w-4" />
              Organization
            </div>
            <div className="w-8 h-0.5 bg-muted" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <User className="h-4 w-4" />
              Admin Account
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Step 1: Organization Details */}
              <div className={step === 1 ? 'block animate-fade-in' : 'hidden'}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="e.g., Heart to Heart Foundation" 
                              className="pl-10 h-12 rounded-xl"
                              {...field}
                              onChange={(e) => handleOrganizationNameChange(e.target.value)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organizationSlug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization URL *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="heart-to-heart" 
                              className="pl-10 h-12 rounded-xl"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          This will be your unique organization identifier: {field.value || 'your-org'}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of your organization..." 
                            className="min-h-[80px] rounded-xl resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="email"
                                placeholder="info@yourorg.com" 
                                className="pl-10 h-12 rounded-xl"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="+1 234 567 8900" 
                                className="pl-10 h-12 rounded-xl"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="e.g., Kenya" 
                                className="pl-10 h-12 rounded-xl"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="https://yourorg.com" 
                                className="pl-10 h-12 rounded-xl"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedToStep2()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent mt-4"
                  >
                    Continue to Admin Account
                  </Button>
                </div>
              </div>

              {/* Step 2: Admin Account */}
              <div className={step === 2 ? 'block animate-fade-in' : 'hidden'}>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-xl mb-4">
                    <p className="text-sm text-muted-foreground">
                      Creating admin account for <span className="font-semibold text-foreground">{form.getValues('organizationName')}</span>
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="adminFullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Full Name *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="John Doe" 
                              className="pl-10 h-12 rounded-xl"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Email *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="email"
                              placeholder="admin@yourorg.com" 
                              className="pl-10 h-12 rounded-xl"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="password"
                              placeholder="Create a password" 
                              className="pl-10 h-12 rounded-xl"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="password"
                              placeholder="Confirm your password" 
                              className="pl-10 h-12 rounded-xl"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent mt-4"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Organization...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Create Organization
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/auth" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
