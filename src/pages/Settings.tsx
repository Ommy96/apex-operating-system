import { useState, useEffect } from 'react';
import { Save, Users, Shield, Database, Bell, User, Mail, Phone, MapPin, Clock, Settings as SettingsIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    organizationName: 'Heart 2 Heart',
    contactEmail: '',
    phoneNumber: '',
    timezone: 'UTC',
    address: '',
    requireEmailVerification: true,
    twoFactorAuth: false,
    auditLogging: true
  });
  const [notificationSettings, setNotificationSettings] = useState({
    newChildEnrollment: true,
    activityReminders: true,
    visitNotifications: true,
    reportGeneration: false,
    systemMaintenance: true,
    dataBackupNotifications: true
  });

  useEffect(() => {
    fetchUsers();
    fetchPrograms();
  }, []);

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

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'management' | 'staff') => {
    console.log('Updating user role:', { userId, newRole, currentUserRole: userRole });
    
    // Only allow admins to update roles
    if (userRole !== 'admin') {
      toast({
        title: "Permission Denied",
        description: "Only administrators can update user roles",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error, data } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .select();

      console.log('Update result:', { error, data });

      if (error) throw error;

      if (data && data.length > 0) {
        toast({
          title: "Success",
          description: "User role updated successfully",
        });

        // Refetch users to update the list
        fetchUsers();
      } else {
        throw new Error('No user was updated');
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: `Failed to update user role: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const updateProgramStatus = async (programId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('programs')
        .update({ is_active: isActive })
        .eq('id', programId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Program ${isActive ? 'activated' : 'deactivated'} successfully`,
      });

      fetchPrograms();
    } catch (error) {
      console.error('Error updating program status:', error);
      toast({
        title: "Error",
        description: "Failed to update program status",
        variant: "destructive",
      });
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

  const saveSystemSettings = async () => {
    setLoading(true);
    try {
      // Save settings to the settings table
      const settingsToSave = [
        { key: 'system_name', value: systemSettings.organizationName },
        { key: 'notification_email', value: systemSettings.contactEmail },
        { key: 'timezone', value: systemSettings.timezone },
        { key: 'audit_logging', value: systemSettings.auditLogging }
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from('settings')
          .upsert({ 
            key: setting.key, 
            value: JSON.stringify(setting.value),
            description: `System setting for ${setting.key}`
          });
      }

      toast({
        title: "Success",
        description: "System settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast({
        title: "Error", 
        description: "Failed to save system settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async () => {
    setLoading(true);
    try {
      // Save notification settings to the settings table
      const settingsToSave = [
        { key: 'new_child_enrollment', value: notificationSettings.newChildEnrollment },
        { key: 'activity_reminders', value: notificationSettings.activityReminders },
        { key: 'visit_notifications', value: notificationSettings.visitNotifications }
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from('settings')
          .upsert({ 
            key: setting.key, 
            value: JSON.stringify(setting.value),
            description: `Notification setting for ${setting.key}`
          });
      }

      toast({
        title: "Success",
        description: "Notification settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings", 
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-lg">
            <SettingsIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground">Manage system settings and configurations</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="grid grid-cols-5 bg-gradient-to-r from-muted/50 to-muted/80">
          <TabsTrigger value="roles" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" />
            Role Assignment
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="programs" className="data-[state=active]:bg-gradient-secondary data-[state=active]:text-white">
            <Database className="h-4 w-4 mr-2" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-gradient-warm data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-accent data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          {userRole !== 'admin' ? (
            <Card className="shadow-soft border-destructive/20">
              <CardHeader className="bg-gradient-to-r from-destructive/5 to-destructive/10">
                <CardTitle className="flex items-center text-destructive">
                  <Shield className="h-5 w-5 mr-2" />
                  Access Denied
                </CardTitle>
                <CardDescription>You don't have permission to manage user roles. Only administrators can assign roles.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card className="shadow-soft border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardTitle className="flex items-center">
                  <div className="p-2 bg-gradient-primary rounded-lg mr-3">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  Role Assignment
                </CardTitle>
                <CardDescription>Assign and manage user roles. Only admins can assign Staff or Management roles.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-lg">{user.full_name}</h4>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getRoleBadgeVariant(user.role) as any} className="capitalize">
                                Current: {user.role}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <Label htmlFor={`role-${user.id}`} className="text-sm font-medium">
                              Assign Role
                            </Label>
                            <Select
                              value={user.role}
                              onValueChange={(newRole: 'admin' | 'management' | 'staff') => updateUserRole(user.user_id, newRole)}
                            >
                              <SelectTrigger className="w-40 bg-background mt-1">
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
                      </div>
                    ))
                  )}
                  
                  <div className="mt-6 p-4 rounded-lg bg-muted/30 border-l-4 border-primary">
                    <h4 className="font-semibold text-sm text-foreground mb-2">Role Permissions:</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Admin</Badge>
                        <span>Full system access, can manage all users and assign roles</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">Management</Badge>
                        <span>Can view reports and manage programs, limited user access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Staff</Badge>
                        <span>Can create and edit reports, view assigned children</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="shadow-soft border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardTitle className="flex items-center">
                <div className="p-2 bg-gradient-primary rounded-lg mr-3">
                  <Users className="h-5 w-5 text-white" />
                </div>
                User Management
              </CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-muted/20 hover:from-muted/20 hover:to-muted/40 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{user.full_name}</h4>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={getRoleBadgeVariant(user.role) as any} className="capitalize">
                          {user.role}
                        </Badge>
                        <Select
                          value={user.role}
                          onValueChange={(newRole: 'admin' | 'management' | 'staff') => updateUserRole(user.user_id, newRole)}
                        >
                          <SelectTrigger className="w-32 bg-background">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <Card className="shadow-soft border-secondary/20">
            <CardHeader className="bg-gradient-to-r from-secondary/5 to-accent/5">
              <CardTitle className="flex items-center">
                <div className="p-2 bg-gradient-secondary rounded-lg mr-3">
                  <Database className="h-5 w-5 text-white" />
                </div>
                Program Management
              </CardTitle>
              <CardDescription>Configure available programs and their settings</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {programs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No programs found</p>
                  </div>
                ) : (
                  programs.map((program, index) => (
                    <div key={program.id} className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-secondary/10 hover:from-secondary/10 hover:to-secondary/20 transition-all duration-200">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center">
                          <Database className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{program.name}</h4>
                          <p className="text-sm text-muted-foreground">{program.description || 'No description available'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={program.is_active ? "default" : "outline"} className={program.is_active ? "bg-success text-success-foreground" : ""}>
                          {program.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`program-${program.id}`} className="text-sm font-medium">
                            Active
                          </Label>
                          <Switch
                            id={`program-${program.id}`}
                            checked={program.is_active}
                            onCheckedChange={(checked) => updateProgramStatus(program.id, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                System Configuration
              </CardTitle>
              <CardDescription>Configure system-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="organization-name">Organization Name</Label>
                  <Input
                    id="organization-name"
                    value={systemSettings.organizationName}
                    onChange={(e) => setSystemSettings({...systemSettings, organizationName: e.target.value})}
                    placeholder="Enter organization name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={systemSettings.contactEmail}
                    onChange={(e) => setSystemSettings({...systemSettings, contactEmail: e.target.value})}
                    placeholder="Enter contact email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    value={systemSettings.phoneNumber}
                    onChange={(e) => setSystemSettings({...systemSettings, phoneNumber: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={systemSettings.timezone} onValueChange={(value) => setSystemSettings({...systemSettings, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time</SelectItem>
                      <SelectItem value="CST">Central Time</SelectItem>
                      <SelectItem value="MST">Mountain Time</SelectItem>
                      <SelectItem value="PST">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Organization Address</Label>
                <Textarea
                  id="address"
                  value={systemSettings.address}
                  onChange={(e) => setSystemSettings({...systemSettings, address: e.target.value})}
                  placeholder="Enter organization address"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Security Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require email verification</Label>
                    <p className="text-sm text-muted-foreground">
                      New users must verify their email address
                    </p>
                  </div>
                  <Switch 
                    checked={systemSettings.requireEmailVerification}
                    onCheckedChange={(checked) => setSystemSettings({...systemSettings, requireEmailVerification: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-factor authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable 2FA for enhanced security
                    </p>
                  </div>
                  <Switch 
                    checked={systemSettings.twoFactorAuth}
                    onCheckedChange={(checked) => setSystemSettings({...systemSettings, twoFactorAuth: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audit logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all user actions for compliance
                    </p>
                  </div>
                  <Switch 
                    checked={systemSettings.auditLogging}
                    onCheckedChange={(checked) => setSystemSettings({...systemSettings, auditLogging: checked})}
                  />
                </div>
              </div>

              <Button onClick={saveSystemSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Email Notifications</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>New child enrollment</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when a new child is enrolled
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSettings.newChildEnrollment}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newChildEnrollment: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activity reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders for scheduled activities
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSettings.activityReminders}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, activityReminders: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Visit notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify about upcoming visits
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSettings.visitNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, visitNotifications: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Report generation</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when reports are ready
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSettings.reportGeneration}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, reportGeneration: checked})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">System Alerts</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>System maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert users about maintenance windows
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSettings.systemMaintenance}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemMaintenance: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data backup notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify about backup status
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSettings.dataBackupNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, dataBackupNotifications: checked})}
                  />
                </div>
              </div>

              <Button onClick={saveNotificationSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}