import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Building2, User, Mail, Lock, Phone, Globe, MapPin,
  Sparkles, CheckCircle2, LogOut, FileText, Crown, Zap, Shield, Check, Eye, EyeOff, Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Constants ───────────────────────────────────────────────────────────────
const ORG_TYPES = [
  'NGO', 'CBO', 'Foundation', 'Faith-Based Organization',
  'Corporate CSR', 'Government Agency',
] as const;

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'KSh 0',
    icon: Zap,
    color: 'text-muted-foreground',
    features: ['Up to 100 beneficiaries', 'Up to 5 users', 'Basic reports', 'Community support'],
    limits: { beneficiaries: 100, users: 5, storage: '500 MB' },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'KSh 5,000/mo',
    icon: Crown,
    color: 'text-primary',
    popular: true,
    features: ['Up to 1,000 beneficiaries', 'Up to 25 users', 'Advanced analytics', 'Priority support', 'Custom indicators'],
    limits: { beneficiaries: 1000, users: 25, storage: '5 GB' },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    icon: Shield,
    color: 'text-violet-500',
    features: ['Unlimited beneficiaries', 'Unlimited users', 'Executive dashboards', 'Dedicated support', 'Custom modules', 'API access'],
    limits: { beneficiaries: -1, users: -1, storage: 'Unlimited' },
  },
] as const;

// ─── Schema ──────────────────────────────────────────────────────────────────
const organizationSchema = z.object({
  // Step 1 – Organization
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  organizationSlug: z.string().min(3, 'Slug must be at least 3 characters').max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  organizationType: z.string().min(1, 'Please select an organization type'),
  description: z.string().max(500).optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  country: z.string().max(60).optional().or(z.literal('')),
  county: z.string().max(60).optional().or(z.literal('')),
  registrationNumber: z.string().max(50).optional().or(z.literal('')),
  // Step 2 – Admin
  adminFullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  adminEmail: z.string().email('Please enter a valid email'),
  adminPhone: z.string().max(20).optional().or(z.literal('')),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
  // Step 3 – Plan
  plan: z.string(),
}).refine((d) => d.adminPassword === d.confirmPassword, {
  message: "Passwords don't match", path: ['confirmPassword'],
});

type FormData = z.infer<typeof organizationSchema>;

// ─── Steps definition ────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Organization', icon: Building2 },
  { label: 'Admin Account', icon: User },
  { label: 'Select Plan', icon: Crown },
  { label: 'Review & Launch', icon: Sparkles },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function RegisterOrganization() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(organizationSchema),
    mode: 'onChange',
    defaultValues: {
      organizationName: '', organizationSlug: '', organizationType: '',
      description: '', email: '', phone: '', website: '', address: '',
      country: '', county: '', registrationNumber: '',
      adminFullName: '', adminEmail: '', adminPhone: '',
      adminPassword: '', confirmPassword: '', plan: 'free',
    },
  });

  const watchPassword = form.watch('adminPassword');
  useEffect(() => {
    let s = 0;
    if (watchPassword.length >= 8) s++;
    if (/[A-Z]/.test(watchPassword)) s++;
    if (/[a-z]/.test(watchPassword)) s++;
    if (/[0-9]/.test(watchPassword)) s++;
    if (/[^A-Za-z0-9]/.test(watchPassword)) s++;
    setPasswordStrength(s);
  }, [watchPassword]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  const handleOrgNameChange = (value: string) => {
    form.setValue('organizationName', value);
    const cur = form.getValues('organizationSlug');
    if (!cur || cur === generateSlug(form.getValues('organizationName').slice(0, -1)))
      form.setValue('organizationSlug', generateSlug(value));
  };

  // Step validation helpers
  const canGoNext = () => {
    const v = form.getValues();
    if (step === 0) return v.organizationName.length >= 2 && /^[a-z0-9-]{3,}$/.test(v.organizationSlug) && v.organizationType.length > 0;
    if (step === 1) {
      return v.adminFullName.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.adminEmail) &&
        v.adminPassword.length >= 8 && v.adminPassword === v.confirmPassword && passwordStrength >= 3;
    }
    return true; // plan + review always passable
  };

  const handleBackOrSignOut = async () => {
    if (step > 0) { setStep(step - 1); return; }
    if (user) {
      try { await signOut(); } catch {}
      setTimeout(() => navigate('/auth'), 100);
    } else { navigate('/auth'); }
  };

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // 1 – slug uniqueness
      const { data: existing } = await supabase.from('organizations').select('id').eq('slug', data.organizationSlug).maybeSingle();
      if (existing) { form.setError('organizationSlug', { message: 'This URL is already taken' }); setStep(0); setIsLoading(false); return; }

      // 2 – create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail, password: data.adminPassword,
        options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: data.adminFullName } },
      });
      if (authError) {
        if (authError.message.includes('already registered')) { form.setError('adminEmail', { message: 'Email already registered. Please sign in.' }); setStep(1); }
        else throw authError;
        setIsLoading(false); return;
      }
      if (!authData.user) throw new Error('Failed to create user account');

      // 3 – create org
      const selectedPlan = PLANS.find(p => p.id === data.plan) || PLANS[0];
      const featuresEnabled = {
        max_users: selectedPlan.limits.users === -1 ? 9999 : selectedPlan.limits.users,
        max_beneficiaries: selectedPlan.limits.beneficiaries === -1 ? 999999 : selectedPlan.limits.beneficiaries,
        reports_enabled: true,
        indicators_enabled: data.plan !== 'free',
        custom_entities: data.plan === 'enterprise',
      };

      const { data: newOrg, error: orgError } = await supabase.from('organizations').insert({
        name: data.organizationName, slug: data.organizationSlug,
        description: data.description || null, email: data.email || null,
        phone: data.phone || null, website: data.website || null,
        address: data.address || null, country: data.country || null,
        organization_type: data.organizationType, county: data.county || null,
        registration_number: data.registrationNumber || null,
        subscription_tier: data.plan, subscription_status: 'active', is_active: true,
        features_enabled: featuresEnabled,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      }).select().single();
      if (orgError) throw orgError;

      // 4 – org membership
      const { error: memberError } = await supabase.from('organization_members').insert({
        user_id: authData.user.id, organization_id: newOrg.id, role: 'admin', is_primary: true,
      });
      if (memberError) throw memberError;

      // 5 – profile update (keep for display purposes only, role is in user_roles)
      await supabase.from('profiles').update({
        organization_id: newOrg.id,
        role: 'admin',
      }).eq('user_id', authData.user.id);

      // 6 – user_roles (source of truth for role)
      await supabase.from('user_roles').upsert({
        user_id: authData.user.id, role: 'admin', granted_at: new Date().toISOString(),
      });

      // 7 – seed default RBAC roles for the organization
      try {
        await supabase.rpc('seed_default_org_roles', {
          _org_id: newOrg.id,
          _admin_user_id: authData.user.id,
        });
      } catch (rbacError) {
        // Non-fatal: RBAC seeding failure doesn't block registration
        console.warn('RBAC seeding warning:', rbacError);
      }

      setRegistrationComplete(true);
      toast.success('Organization registered successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register organization');
    } finally { setIsLoading(false); }
  };

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-background/80 backdrop-blur-xl">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full animate-bounce">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome Aboard! 🎉</CardTitle>
            <CardDescription className="text-base">
              Your organization has been created. Check your email to verify your account, then sign in to start.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <Button onClick={() => navigate('/auth')} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const values = form.getValues();

  // ─── Main Wizard ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-3xl relative z-10 border-0 shadow-2xl bg-background/80 backdrop-blur-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />

        {/* Header */}
        <CardHeader className="text-center pt-6 pb-2">
          <Button variant="ghost" size="sm" className="absolute left-4 top-6 text-muted-foreground hover:text-foreground" onClick={handleBackOrSignOut}>
            {step === 0 && user ? <><LogOut className="h-4 w-4 mr-2" />Sign Out</> : <><ArrowLeft className="h-4 w-4 mr-2" />Back</>}
          </Button>
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-xl opacity-50" />
              <div className="relative p-3 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg">
                <Building2 className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Register Your Organization
          </CardTitle>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-1 mt-4 px-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <div className={`hidden sm:block w-8 h-0.5 ${isDone ? 'bg-primary' : 'bg-muted'}`} />}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive ? 'bg-primary text-primary-foreground shadow-md' :
                      isDone ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

              {/* ── STEP 0: Organization Information ────────────────────────── */}
              {step === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <FormField control={form.control} name="organizationName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g., Heart to Heart Foundation" className="pl-10 h-11 rounded-xl" {...field} onChange={e => handleOrgNameChange(e.target.value)} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="organizationSlug" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization URL *</FormLabel>
                      <FormControl>
                        <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="heart-to-heart" className="pl-10 h-11 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Unique identifier: {field.value || 'your-org'}</p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="organizationType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select organization type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Brief description..." className="min-h-[70px] rounded-xl resize-none" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Email</FormLabel>
                        <FormControl>
                          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="info@yourorg.com" className="pl-10 h-11 rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="+254 700 000 000" className="pl-10 h-11 rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="e.g., Kenya" className="pl-10 h-11 rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="county" render={({ field }) => (
                      <FormItem>
                        <FormLabel>County / Region</FormLabel>
                        <FormControl>
                          <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="e.g., Nairobi" className="pl-10 h-11 rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Address</FormLabel>
                        <FormControl><Input placeholder="Street address" className="h-11 rounded-xl" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <div className="relative"><FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Optional" className="pl-10 h-11 rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="website" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="https://yourorg.com" className="pl-10 h-11 rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* ── STEP 1: Admin Account ──────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground">Admin for <span className="font-semibold text-foreground">{values.organizationName}</span></p>
                  </div>

                  <FormField control={form.control} name="adminFullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="John Doe" className="pl-10 h-11 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="adminEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="admin@yourorg.com" className="pl-10 h-11 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="adminPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="+254 700 000 000" className="pl-10 h-11 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="adminPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars, upper, lower, number" className="pl-10 pr-10 h-11 rounded-xl" {...field} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {/* Password strength bar */}
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength
                              ? passwordStrength <= 2 ? 'bg-destructive' : passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                              : 'bg-muted'
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Fair' : passwordStrength <= 4 ? 'Strong' : 'Very strong'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter password" className="pl-10 pr-10 h-11 rounded-xl" {...field} />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── STEP 2: Plan Selection ─────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-sm text-muted-foreground text-center">Choose a plan that fits your organization. You can upgrade anytime.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map(plan => {
                      const Icon = plan.icon;
                      const selected = values.plan === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => form.setValue('plan', plan.id)}
                          className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                            selected ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/40'
                          }`}
                        >
                          {'popular' in plan && plan.popular && (
                            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                              Most Popular
                            </Badge>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-5 w-5 ${plan.color}`} />
                            <span className="font-semibold">{plan.name}</span>
                          </div>
                          <p className="text-lg font-bold mb-3">{plan.price}</p>
                          <ul className="space-y-1.5">
                            {plan.features.map(f => (
                              <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                          {selected && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review & Launch ─────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-sm text-muted-foreground text-center">Please review your details before creating your organization.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Org summary */}
                    <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Organization</h4>
                      <ReviewRow label="Name" value={values.organizationName} />
                      <ReviewRow label="Type" value={values.organizationType} />
                      <ReviewRow label="URL" value={values.organizationSlug} />
                      {values.country && <ReviewRow label="Country" value={values.country} />}
                      {values.county && <ReviewRow label="County" value={values.county} />}
                      {values.email && <ReviewRow label="Email" value={values.email} />}
                      {values.phone && <ReviewRow label="Phone" value={values.phone} />}
                    </div>

                    {/* Admin + Plan summary */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><User className="h-4 w-4 text-primary" />Admin Account</h4>
                        <ReviewRow label="Name" value={values.adminFullName} />
                        <ReviewRow label="Email" value={values.adminEmail} />
                        <ReviewRow label="Role" value="Organization Admin" />
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><Crown className="h-4 w-4 text-primary" />Plan</h4>
                        <ReviewRow label="Selected" value={PLANS.find(p => p.id === values.plan)?.name || 'Free'} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Navigation buttons ─────────────────────────────────────── */}
              <div className="flex gap-3 pt-2">
                {step < 3 ? (
                  <Button type="button" onClick={() => setStep(step + 1)} disabled={!canGoNext()} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
                    {isLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating Organization...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Create Organization</span>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{' '}
            <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
