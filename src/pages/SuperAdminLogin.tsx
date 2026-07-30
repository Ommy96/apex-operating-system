import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { SUPER_ADMIN_EMAIL, isSuperAdmin } from '@/lib/superAdmin';

export default function SuperAdminLogin() {
  const { user, signUp, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-warning/20 border-t-amber-500"></div>
          <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-warning animate-pulse" />
        </div>
      </div>
    );
  }

  if (user && isSuperAdmin(user.email)) {
    return <Navigate to="/admin/infera" replace />;
  }

  if (user && !isSuperAdmin(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-muted-foreground/80 backdrop-blur-xl">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-destructive/20 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground">
              This portal is restricted to system administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <Button
              variant="outline"
              className="w-full border-border text-muted-foreground hover:bg-muted-foreground"
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        const { error: signUpError } = await signUp(SUPER_ADMIN_EMAIL, password, 'Super Admin');
        if (signUpError) {
          setError(signUpError.message || 'Registration failed');
          return;
        }
        const { error: signInError } = await signIn(SUPER_ADMIN_EMAIL, password);
        if (signInError) {
          setError(null);
          setIsRegistering(false);
          toast({
            title: "Account Created",
            description: "Super admin account created. Please check your email to confirm, then sign in.",
          });
        }
      } else {
        const { error: signInError } = await signIn(SUPER_ADMIN_EMAIL, password);
        if (signInError) {
          if (signInError.message?.includes('Invalid login credentials')) {
            setError('No account found. Use "First-Time Setup" to create your admin account.');
          } else {
            setError(signInError.message || 'Authentication failed');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-warning/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-warning/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-warning/5 to-warning/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-0 shadow-2xl bg-muted-foreground/80 backdrop-blur-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-warning via-warning to-warning" />

        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-warning to-warning rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-4 bg-gradient-to-br from-warning to-warning rounded-2xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-warning to-warning bg-clip-text text-transparent">
            {isRegistering ? 'First-Time Setup' : 'System Administrator'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isRegistering
              ? 'Create your super admin account to get started'
              : 'Infera Platform Administration Portal'}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-destructive/10 border-destructive/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={SUPER_ADMIN_EMAIL}
                  disabled
                  className="pl-10 h-12 rounded-xl border-border bg-muted-foreground/50 text-muted-foreground placeholder:text-muted-foreground focus:border-warning/30 focus:ring-warning/20 disabled:opacity-70"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={isRegistering ? "Create a strong password" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-border bg-muted-foreground/50 text-muted-foreground placeholder:text-muted-foreground focus:border-warning/30 focus:ring-warning/20"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <Label className="text-muted-foreground font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-border bg-muted-foreground/50 text-muted-foreground placeholder:text-muted-foreground focus:border-warning/30 focus:ring-warning/20"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-warning to-warning hover:opacity-90 transition-opacity font-semibold shadow-lg text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRegistering ? 'Creating Account...' : 'Authenticating...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {isRegistering ? 'Create Admin Account' : 'Access Admin Portal'}
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setConfirmPassword('');
              }}
              className="w-full text-center text-sm text-warning hover:text-warning transition-colors"
            >
              {isRegistering
                ? '← Back to Sign In'
                : 'First time? Set up your admin account →'}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              This portal is exclusively for Infera system administrators.
              <br />
              Unauthorized access attempts are logged.
            </p>
          </div>
        </CardContent>

        <div className="h-1 bg-gradient-to-r from-transparent via-warning/50 to-transparent" />
      </Card>
    </div>
  );
}