import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Shield, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { SUPER_ADMIN_EMAIL, isSuperAdmin } from '@/lib/superAdmin';

const superAdminSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.password === data.confirmPassword;
  }
  return true;
}, { message: "Passwords don't match", path: ["confirmPassword"] });

type SuperAdminFormData = z.infer<typeof superAdminSchema>;

export default function SuperAdminLogin() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SuperAdminFormData>({
    resolver: zodResolver(superAdminSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/20 border-t-amber-500"></div>
          <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-amber-500 animate-pulse" />
        </div>
      </div>
    );
  }

  // If user is logged in and is super admin, redirect to admin dashboard
  if (user && isSuperAdmin(user.email)) {
    return <Navigate to="/admin/infera" replace />;
  }

  // If user is logged in but NOT super admin, show access denied
  if (user && !isSuperAdmin(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-slate-800/80 backdrop-blur-xl">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-500/20 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-400">Access Denied</CardTitle>
            <CardDescription className="text-slate-400">
              This portal is restricted to system administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (data: SuperAdminFormData) => {
    setError(null);
    
    // Check if email matches super admin before attempting login
    if (!isSuperAdmin(data.email)) {
      setError('Access denied. This portal is restricted to system administrators.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      // Navigation will happen automatically via the redirect above
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-0 shadow-2xl bg-slate-800/80 backdrop-blur-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        
        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            System Administrator
          </CardTitle>
          <CardDescription className="text-slate-400">
            Infera Platform Administration Portal
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-8">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 font-medium">Admin Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input 
                          type="email"
                          placeholder="Enter admin email" 
                          className="pl-10 h-12 rounded-xl border-slate-600 bg-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20" 
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input 
                          type="password" 
                          placeholder="Enter password" 
                          className="pl-10 h-12 rounded-xl border-slate-600 bg-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20" 
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
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 transition-opacity font-semibold shadow-lg text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Access Admin Portal
                  </div>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-4 border-t border-slate-700">
            <p className="text-center text-xs text-slate-500">
              This portal is exclusively for Infera system administrators.
              <br />
              Unauthorized access attempts are logged.
            </p>
          </div>
        </CardContent>
        
        <div className="h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </Card>
    </div>
  );
}
