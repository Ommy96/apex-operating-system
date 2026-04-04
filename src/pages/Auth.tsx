import { logger } from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle2, Mail, Lock, User, Sparkles, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const inviteSignUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type SignInFormData = z.infer<typeof signInSchema>;
type InviteSignUpFormData = z.infer<typeof inviteSignUpSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  status: string;
  expires_at: string;
  organization?: {
    name: string;
  };
}

export default function Auth() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  
  // Invitation state
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const inviteSignUpForm = useForm<InviteSignUpFormData>({
    resolver: zodResolver(inviteSignUpSchema),
    defaultValues: {
      fullName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Fetch invitation details when token is present
  useEffect(() => {
    if (inviteToken) {
      fetchInvitation(inviteToken);
    }
  }, [inviteToken]);

  const fetchInvitation = async (token: string) => {
    setInvitationLoading(true);
    setInvitationError(null);
    
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          id,
          email,
          role,
          organization_id,
          status,
          expires_at,
          organizations:organization_id (name)
        `)
        .eq('token', token)
        .single();

      if (error) {
        setInvitationError('Invalid invitation link');
        return;
      }

      if (!data) {
        setInvitationError('Invitation not found');
        return;
      }

      if (data.status !== 'pending') {
        setInvitationError('This invitation has already been used or cancelled');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setInvitationError('This invitation has expired');
        return;
      }

      setInvitation({
        ...data,
        organization: data.organizations as unknown as { name: string }
      });
    } catch (err) {
      setInvitationError('Failed to load invitation');
    } finally {
      setInvitationLoading(false);
    }
  };

  if (loading || invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500 animate-pulse" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    await signIn(data.email, data.password);
    setIsLoading(false);
  };

  const handleInviteSignUp = async (data: InviteSignUpFormData) => {
    if (!invitation) return;
    
    setIsLoading(true);
    try {
      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: data.fullName,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: invitation.email,
            full_name: data.fullName,
            organization_id: invitation.organization_id,
            role: 'staff', // Default role in profiles
          });

        if (profileError) {
          logger.error('Profile creation error:', profileError);
        }

        // Add to organization members
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: invitation.organization_id,
            user_id: authData.user.id,
            role: invitation.role,
            is_primary: true,
          });

        if (memberError) {
          logger.error('Member creation error:', memberError);
        }

        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'staff',
          });

        if (roleError) {
          logger.error('Role creation error:', roleError);
        }

        // Mark invitation as accepted
        await supabase
          .from('organization_invitations')
          .update({ 
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

        toast.success('Account created successfully! Please check your email to verify your account.');
        navigate('/auth');
      }
    } catch (error: any) {
      logger.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsForgotPasswordLoading(true);
    
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: redirectUrl,
    });
    
    setIsForgotPasswordLoading(false);
    
    if (error) {
      logger.error('Error sending password reset email:', error);
    } else {
      setForgotPasswordSuccess(true);
      forgotPasswordForm.reset();
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  // Invitation-based signup view
  if (inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <Card className="w-full max-w-md relative z-10 border-0 shadow-2xl bg-background/80 backdrop-blur-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
          
          <CardHeader className="text-center pt-8 pb-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-6 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate('/auth')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
            
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              Accept Invitation
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Join your organization on Ufanisi
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 pb-8">
            {invitationError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{invitationError}</AlertDescription>
              </Alert>
            ) : invitation ? (
              <>
                <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">You've been invited to join</p>
                  <p className="font-semibold text-lg">{invitation.organization?.name}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Role: <span className="font-medium capitalize">{invitation.role}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Email: <span className="font-medium">{invitation.email}</span>
                  </p>
                </div>

                <Form {...inviteSignUpForm}>
                  <form onSubmit={inviteSignUpForm.handleSubmit(handleInviteSignUp)} className="space-y-4">
                    <FormField
                      control={inviteSignUpForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Enter your full name" 
                                className="pl-10 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={inviteSignUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                className="pl-10 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={inviteSignUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                className="pl-10 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors" 
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
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 transition-opacity font-semibold shadow-lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating Account...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Accept & Create Account
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            ) : null}
          </CardContent>
          
          <div className="h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        </Card>
      </div>
    );
  }

  // Default sign-in view (no tabs, just sign in)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-0 shadow-2xl bg-background/80 backdrop-blur-xl overflow-hidden">
        <div className="relative">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
          
          <CardHeader className="text-center pt-8 pb-6">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-6 text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              Ufanisi
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account
            </CardDescription>
          </CardHeader>
        </div>
        
        <CardContent className="px-6 pb-8">
          <Form {...signInForm}>
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="email" 
                          placeholder="Enter your email" 
                          className="pl-10 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={signInForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="Enter your password" 
                          className="pl-10 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors" 
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
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 transition-opacity font-semibold shadow-lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Sign In
                  </div>
                )}
              </Button>
              
              <div className="text-center pt-2">
                <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors">
                      Forgot your password?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-background/95 backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Mail className="h-5 w-5 text-emerald-600" />
                        </div>
                        Reset Password
                      </DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {forgotPasswordSuccess ? (
                      <Alert className="border-green-500/30 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-600 dark:text-green-400">
                          Password reset email sent! Check your inbox and follow the instructions to reset your password.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Form {...forgotPasswordForm}>
                        <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                          <FormField
                            control={forgotPasswordForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                      type="email" 
                                      placeholder="Enter your email address" 
                                      className="pl-10 h-12 rounded-xl"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex gap-3">
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="flex-1 h-12 rounded-xl"
                              onClick={() => {
                                setForgotPasswordOpen(false);
                                setForgotPasswordSuccess(false);
                                forgotPasswordForm.reset();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600" 
                              disabled={isForgotPasswordLoading}
                            >
                              {isForgotPasswordLoading ? 'Sending...' : 'Send Reset Email'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </form>
          </Form>

          {/* Registration options */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <p className="text-sm text-center text-muted-foreground mb-4">
              New to Ufanisi?
            </p>
            <Link to="/register-organization" className="block">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 dark:hover:bg-emerald-950"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Register Your Organization
              </Button>
            </Link>
            <p className="text-xs text-center text-muted-foreground mt-3">
              Already invited? Check your email for the invitation link
            </p>
          </div>
        </CardContent>
        
        <div className="h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      </Card>
    </div>
  );
}
