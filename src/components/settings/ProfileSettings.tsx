import { User, Mail, Shield, Sun, Moon, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from 'next-themes';

export function ProfileSettings() {
  const { user, userRole } = useAuth();
  const { currentOrganization } = useOrganization();
  const { roles: myRbacRoles, isSuperAdmin } = usePermissions();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{user?.email?.split('@')[0] || 'Your Profile'}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> {user?.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address</Label>
              <Input value={user?.email || ''} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Organization</Label>
              <Input value={currentOrganization?.organization_name || ''} disabled className="bg-muted/50" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Your Roles & Permissions</p>
                <p className="text-xs text-muted-foreground">Access levels assigned to you</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {myRbacRoles.length > 0 ? (
                myRbacRoles.map((role) => (
                  <Badge key={role.role_id} variant="secondary" className="text-sm px-3 py-1" style={{ borderLeft: `3px solid ${role.color}` }}>
                    {role.display_name}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {isSuperAdmin ? 'Super Admin' : userRole || 'No role assigned'}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border space-y-3">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Appearance</p>
                <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')} className="flex-1 gap-2">
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')} className="flex-1 gap-2">
                <Moon className="h-4 w-4" /> Dark
              </Button>
              <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')} className="flex-1 gap-2">
                <Monitor className="h-4 w-4" /> System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
