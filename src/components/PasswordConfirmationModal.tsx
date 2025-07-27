import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PasswordConfirmationModalProps {
  isOpen: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

export function PasswordConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  isLoading = false
}: PasswordConfirmationModalProps) {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm this action",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // Verify the admin's password by attempting a dummy sign-in
      // This is a secure way to verify password without storing it
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.email) {
        throw new Error('Unable to verify identity');
      }

      // Note: In a production environment, you might want to use a separate
      // password verification endpoint for better security
      const { error } = await supabase.auth.signInWithPassword({
        email: user.user.email,
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Incorrect Password",
            description: "The password you entered is incorrect",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      // Password is correct, proceed with the action
      onConfirm(password);
      setPassword(''); // Clear password for security
    } catch (error: any) {
      console.error('Password verification error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Unable to verify password",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setPassword(''); // Clear password when canceling
    onCancel();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Security Confirmation Required</p>
                  <p className="text-sm text-destructive/80 mt-1">{description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-sm font-medium">
                  Admin Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10"
                    disabled={isVerifying || isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isVerifying && !isLoading) {
                        handleConfirm();
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your current password to confirm this security-sensitive action
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isVerifying || isLoading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              onClick={handleConfirm}
              disabled={isVerifying || isLoading || !password.trim()}
              variant="destructive"
            >
              {isVerifying ? "Verifying..." : isLoading ? "Processing..." : "Confirm Action"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}