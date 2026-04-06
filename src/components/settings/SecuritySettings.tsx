import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function SecuritySettings() {
  const { user } = useAuth();
  const [timeout, setTimeoutVal] = useState(() => localStorage.getItem("session_timeout") || "60");
  const [signingOut, setSigningOut] = useState(false);

  const has2FA = !!(user as any)?.factors?.length;

  const handleTimeoutChange = (val: string) => {
    setTimeoutVal(val);
    localStorage.setItem("session_timeout", val);
    toast.success("Session timeout updated");
  };

  const handleSignOutOthers = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: "others" as any });
      toast.success("All other sessions signed out");
    } catch (e: any) {
      toast.error(e.message || "Failed to sign out other sessions");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Shield className="h-5 w-5" />Security Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Manage your security and session preferences</p>
      </div>

      <Card className="workspace-card">
        <CardContent className="p-6 space-y-6">
          {/* 2FA */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Two-Factor Authentication</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account</p>
            </div>
            <Badge variant={has2FA ? "default" : "secondary"}>{has2FA ? "Enabled" : "Disabled"}</Badge>
          </div>

          {/* Session timeout */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Session Timeout</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Auto-lock after period of inactivity</p>
            </div>
            <Select value={timeout} onValueChange={handleTimeoutChange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sign out others */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Sign Out All Other Sessions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">End all sessions except this one</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleSignOutOthers} disabled={signingOut}>
              <LogOut className="h-3.5 w-3.5 mr-1" />{signingOut ? "Signing out..." : "Sign Out Others"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
