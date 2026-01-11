import { useState, useEffect } from 'react';
import { Save, Users, Shield, Building2, User, Mail, Phone, MapPin, Settings as SettingsIcon, Globe, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RoleChangeConfirmationModal } from '@/components/RoleChangeConfirmationModal';
import { PasswordConfirmationModal } from '@/components/PasswordConfirmationModal';
import { RateLimitManager } from '@/lib/rateLimitManager';
import { PageHeroHeader } from '@/components/PageHeroHeader';

export default function Settings() {
  const { userRole, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    user: any;
    newRole: 'admin' | 'management' | 'staff';
  }>({
    isOpen: false,
    user: null,
    newRole: 'staff'
  });
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    pendingAction: (() => Promise<void>) | null;
  }>({
    isOpen: false,
    pendingAction: null
  });
  
  const [organizationSettings, setOrganizationSettings] = useState({
    organizationName: 'Heart 2 Heart',
    contactEmail: '',
    phoneNumber: '',
    timezone: 'Africa/Nairobi',
    address: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    activityAlerts: true,
    weeklyDigest: false,
  });

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserProfile();
  }, [user]);

  const fetchCurrentUserProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCurrentUserProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRoleChangeRequest = async (targetUser: any, newRole: 'admin' | 'management' | 'staff') => {
    if (userRole !== 'admin') {
      toast({
        title: "Permission Denied",
        description: "Only administrators can update user roles",
        variant: "destructive",
      });
      return;
    }

    if (targetUser.role === newRole) return;

    const rateLimitResult = await RateLimitManager.checkRateLimit('role_change', 5, 60);
    
    if (!rateLimitResult.allowed) {
      RateLimitManager.handleRateLimitExceeded(rateLimitResult);
      return;
    }

    RateLimitManager.displayRemainingAttempts(rateLimitResult);

    setConfirmationModal({
      isOpen: true,
      user: targetUser,
      newRole
    });
  };

  const proceedWithRoleChange = async () => {
    const { user: targetUser, newRole } = confirmationModal;
    const isAdminChange = newRole === 'admin' || targetUser.role === 'admin';
    
    if (isAdminChange) {
      setConfirmationModal({ isOpen: false, user: null, newRole: 'staff' });
      setPasswordModal({
        isOpen: true,
        pendingAction: () => executeRoleChange(targetUser, newRole)
      });
    } else {
      await executeRoleChange(targetUser, newRole);
    }
  };

  const executeRoleChange = async (targetUser: any, newRole: 'admin' | 'management' | 'staff') => {
    setRoleUpdateLoading(true);
    
    try {
      const oldRole = targetUser.role;
      
      const { error, data } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', targetUser.user_id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        toast({
          title: "Role Updated",
          description: `${targetUser.full_name}'s role changed from ${oldRole} to ${newRole}`,
        });

        fetchUsers();
        setConfirmationModal({ isOpen: false, user: null, newRole: 'staff' });
      } else {
        throw new Error('No user was updated');
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setRoleUpdateLoading(false);
    }
  };

  const handlePasswordConfirmed = async () => {
    if (passwordModal.pendingAction) {
      setPasswordModal({ isOpen: false, pendingAction: null });
      await passwordModal.pendingAction();
    }
  };

  const saveOrganizationSettings = async () => {
    setLoading(true);
    try {
      const settingsToSave = [
        { key: 'organization_name', value: organizationSettings.organizationName },
        { key: 'contact_email', value: organizationSettings.contactEmail },
        { key: 'phone_number', value: organizationSettings.phoneNumber },
        { key: 'timezone', value: organizationSettings.timezone },
        { key: 'address', value: organizationSettings.address },
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from('settings')
          .upsert({ 
            key: setting.key, 
            value: JSON.stringify(setting.value),
            description: `Organization setting: ${setting.key}`
          });
      }

      toast({
        title: "Settings Saved",
        description: "Organization settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error", 
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'management': return 'default';
      case 'staff': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeroHeader
        title="Settings"
        description="Manage your account and organization preferences"
        icon={SettingsIcon}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted/60 p-1.5 backdrop-blur-sm">
          <TabsTrigger 
            value="profile" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="organization"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger 
            value="notifications"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          {userRole === 'admin' && (
            <TabsTrigger 
              value="users"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{currentUserProfile?.full_name || 'Your Profile'}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {currentUserProfile?.email || user?.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    value={currentUserProfile?.full_name || ''}
                    disabled
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    value={currentUserProfile?.email || user?.email || ''}
                    disabled
                    className="bg-muted/50"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Current Role</p>
                  <p className="text-xs text-muted-foreground">Your access level in the system</p>
                </div>
                <Badge variant={getRoleBadgeVariant(userRole || 'staff')} className="capitalize text-sm px-3 py-1">
                  {userRole}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center shadow-lg">
                  <Building2 className="h-7 w-7 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Organization Details</CardTitle>
                  <CardDescription>Manage your organization's information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Organization Name
                  </Label>
                  <Input
                    id="orgName"
                    value={organizationSettings.organizationName}
                    onChange={(e) => setOrganizationSettings({...organizationSettings, organizationName: e.target.value})}
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Contact Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={organizationSettings.contactEmail}
                    onChange={(e) => setOrganizationSettings({...organizationSettings, contactEmail: e.target.value})}
                    placeholder="contact@organization.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={organizationSettings.phoneNumber}
                    onChange={(e) => setOrganizationSettings({...organizationSettings, phoneNumber: e.target.value})}
                    placeholder="+254 xxx xxx xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Timezone
                  </Label>
                  <Select 
                    value={organizationSettings.timezone} 
                    onValueChange={(value) => setOrganizationSettings({...organizationSettings, timezone: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Nairobi">East Africa Time (EAT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">New York (EST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={organizationSettings.address}
                  onChange={(e) => setOrganizationSettings({...organizationSettings, address: e.target.value})}
                  placeholder="Enter organization address"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button 
                onClick={saveOrganizationSettings} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg">
                  <Bell className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Notification Preferences</CardTitle>
                  <CardDescription>Choose what updates you want to receive</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Activity Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified about new activities and events</p>
                </div>
                <Switch
                  checked={notificationSettings.activityAlerts}
                  onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, activityAlerts: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">Receive a weekly summary of activities</p>
                </div>
                <Switch
                  checked={notificationSettings.weeklyDigest}
                  onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, weeklyDigest: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab (Admin Only) */}
        {userRole === 'admin' && (
          <TabsContent value="users" className="space-y-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                    <Users className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">User Management</CardTitle>
                    <CardDescription>Manage team members and their roles</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No users found</p>
                      <p className="text-sm">Users will appear here once they sign up</p>
                    </div>
                  ) : (
                    users.map((targetUser) => (
                      <div 
                        key={targetUser.id} 
                        className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{targetUser.full_name}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {targetUser.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={getRoleBadgeVariant(targetUser.role)} className="capitalize">
                            {targetUser.role}
                          </Badge>
                          <Select
                            value={targetUser.role}
                            onValueChange={(newRole: 'admin' | 'management' | 'staff') => handleRoleChangeRequest(targetUser, newRole)}
                            disabled={roleUpdateLoading}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="management">Management</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-muted/30 border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Role Permissions
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs w-24 justify-center">Admin</Badge>
                      <span className="text-muted-foreground">Full system access, user management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs w-24 justify-center">Management</Badge>
                      <span className="text-muted-foreground">Reports, programs, limited settings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs w-24 justify-center">Staff</Badge>
                      <span className="text-muted-foreground">Data entry, assigned children view</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <RoleChangeConfirmationModal
        isOpen={confirmationModal.isOpen}
        onConfirm={proceedWithRoleChange}
        onCancel={() => setConfirmationModal({ isOpen: false, user: null, newRole: 'staff' })}
        user={confirmationModal.user}
        newRole={confirmationModal.newRole}
        isLoading={roleUpdateLoading}
      />

      <PasswordConfirmationModal
        isOpen={passwordModal.isOpen}
        onConfirm={handlePasswordConfirmed}
        onCancel={() => setPasswordModal({ isOpen: false, pendingAction: null })}
        title="Confirm Admin Role Change"
        description="This action involves admin privileges. Please enter your password to confirm."
        isLoading={roleUpdateLoading}
      />
    </div>
  );
}
