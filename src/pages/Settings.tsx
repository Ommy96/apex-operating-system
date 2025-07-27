import { useState, useEffect } from 'react';
import { Save, Users, Shield, Database, Bell, User, Mail, Phone, MapPin, Clock, Settings as SettingsIcon, Palette, History } from 'lucide-react';
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
import { RoleChangeConfirmationModal } from '@/components/RoleChangeConfirmationModal';
import { PasswordConfirmationModal } from '@/components/PasswordConfirmationModal';
import { RealtimeStatusDemo } from '@/components/RealtimeStatusDemo';
import { RateLimitManager } from '@/lib/rateLimitManager';
import { SecurityDashboard } from '@/components/SecurityDashboard';
import { ApprovalWorkflow } from '@/components/ApprovalWorkflow';
import { AdvancedAuditTrail } from '@/components/AdvancedAuditTrail';
import { RoleIndicator, PermissionMatrix, RoleComparison } from '@/components/RoleIndicatorSystem';

export default function Settings() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
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
    if (userRole === 'admin') {
      fetchAuditLogs();
      setupRealtimeSubscriptions();
    }
  }, [userRole]);

  const setupRealtimeSubscriptions = () => {
    if (userRole !== 'admin') return;

    // Subscribe to real-time audit log updates
    const auditChannel = supabase
      .channel('audit-logs-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: 'event_type=eq.role_change'
        },
        () => {
          // Refresh audit logs when new entries are added
          fetchAuditLogs();
        }
      )
      .subscribe();

    // Subscribe to real-time profile updates
    const profilesChannel = supabase
      .channel('profiles-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'profiles'
        },
        () => {
          // Refresh users list when profiles are updated
          fetchUsers();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(profilesChannel);
    };
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

  const fetchAuditLogs = async () => {
    if (userRole !== 'admin') return;
    
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('event_type', 'role_change')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleRoleChangeRequest = async (user: any, newRole: 'admin' | 'management' | 'staff') => {
    if (userRole !== 'admin') {
      toast({
        title: "Permission Denied",
        description: "Only administrators can update user roles",
        variant: "destructive",
      });
      return;
    }

    if (user.role === newRole) {
      return; // No change needed
    }

    // Check rate limits first
    const rateLimitResult = await RateLimitManager.checkRateLimit('role_change', 5, 60);
    
    if (!rateLimitResult.allowed) {
      RateLimitManager.handleRateLimitExceeded(rateLimitResult);
      return;
    }

    // Show remaining attempts if getting close to limit
    RateLimitManager.displayRemainingAttempts(rateLimitResult);

    setConfirmationModal({
      isOpen: true,
      user,
      newRole
    });
  };

  const proceedWithRoleChange = async () => {
    // For critical role changes (admin assignments or demotions), require password confirmation
    const { user, newRole } = confirmationModal;
    const isAdminChange = newRole === 'admin' || user.role === 'admin';
    
    if (isAdminChange) {
      // Close the confirmation modal and open password modal
      setConfirmationModal({ isOpen: false, user: null, newRole: 'staff' });
      setPasswordModal({
        isOpen: true,
        pendingAction: () => executeRoleChange(user, newRole)
      });
    } else {
      // For non-admin changes, proceed directly
      await executeRoleChange(user, newRole);
    }
  };

  const executeRoleChange = async (user: any, newRole: 'admin' | 'management' | 'staff') => {
    setRoleUpdateLoading(true);
    
    try {
      // Store old role for comparison
      const oldRole = user.role;
      
      console.log('Attempting to update user:', {
        userId: user.user_id,
        currentRole: oldRole,
        newRole: newRole,
        userObject: user
      });
      
      const { error, data, count } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', user.user_id)
        .select();

      console.log('Update result:', { error, data, count });

      if (error) throw error;

      if (data && data.length > 0) {
        toast({
          title: "Success",
          description: `User role updated from ${oldRole} to ${newRole}`,
        });

        // Trigger email notification (will be implemented after Resend setup)
        await triggerEmailNotification(user, oldRole, newRole);

        // The real-time subscription will handle the notification automatically
        console.log(`Role change completed for user ${user.user_id}: ${oldRole} → ${newRole}`);

        // Refetch users to update the list
        fetchUsers();
        // Refetch audit logs to show the new entry
        fetchAuditLogs();
        
        // Close modal
        setConfirmationModal({ isOpen: false, user: null, newRole: 'staff' });
      } else {
        throw new Error(`No user was updated. Query result: ${JSON.stringify({ data, count })}`);
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: `Failed to update user role. ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setRoleUpdateLoading(false);
    }
  };

  const handlePasswordConfirmed = async (password: string) => {
    if (passwordModal.pendingAction) {
      setPasswordModal({ isOpen: false, pendingAction: null });
      await passwordModal.pendingAction();
    }
  };

  const triggerEmailNotification = async (user: any, oldRole: string, newRole: string) => {
    try {
      // Call the email notification edge function (to be implemented)
      const { error } = await supabase.functions.invoke('send-role-change-notification', {
        body: {
          targetUser: {
            email: user.email,
            name: user.full_name
          },
          oldRole,
          newRole,
          changedBy: {
            email: user?.email,
            // Admin info will be added by the edge function
          }
        }
      });

      if (error) {
        console.error('Email notification failed:', error);
        // Don't block the role change if email fails
      }
    } catch (error) {
      console.error('Email notification error:', error);
      // Don't block the role change if email fails
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
      {/* Real-time Status Indicator */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Real-time Updates Active</h3>
            <p className="text-xs text-green-600 dark:text-green-400">Role changes and audit logs are updated instantly across all sessions</p>
          </div>
        </div>
      </div>

      {/* Security Dashboard (only for admins) */}
      {userRole === 'admin' && (
        <SecurityDashboard />
      )}

      {/* Real-time Demo Component (only for admins) */}
      {userRole === 'admin' && (
        <RealtimeStatusDemo />
      )}
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

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid grid-cols-7 bg-gradient-to-r from-muted/50 to-muted/80">
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
          <TabsTrigger value="audit" className="data-[state=active]:bg-gradient-accent data-[state=active]:text-white">
            <History className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="approval" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            <Clock className="h-4 w-4 mr-2" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-gradient-secondary data-[state=active]:text-white">
            <User className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {userRole !== 'admin' ? (
            <Card className="shadow-soft border-destructive/20">
              <CardHeader className="bg-gradient-to-r from-destructive/5 to-destructive/10">
                <CardTitle className="flex items-center text-destructive">
                  <Shield className="h-5 w-5 mr-2" />
                  Access Denied
                </CardTitle>
                <CardDescription>You don't have permission to manage users. Only administrators can manage user accounts and assign roles.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card className="shadow-soft border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardTitle className="flex items-center">
                  <div className="p-2 bg-gradient-primary rounded-lg mr-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  User Management & Role Assignment
                </CardTitle>
                <CardDescription>Manage user accounts, permissions, and role assignments. Only admins can assign Staff or Management roles.</CardDescription>
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
                              onValueChange={(newRole: 'admin' | 'management' | 'staff') => handleRoleChangeRequest(user, newRole)}
                              disabled={roleUpdateLoading}
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

        <TabsContent value="audit" className="space-y-4">
          {userRole !== 'admin' ? (
            <Card className="shadow-soft border-destructive/20">
              <CardHeader className="bg-gradient-to-r from-destructive/5 to-destructive/10">
                <CardTitle className="flex items-center text-destructive">
                  <Shield className="h-5 w-5 mr-2" />
                  Access Denied
                </CardTitle>
                <CardDescription>You don't have permission to view audit logs. Only administrators can access this information.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card className="shadow-soft border-accent/20">
              <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5">
                <CardTitle className="flex items-center">
                  <div className="p-2 bg-gradient-accent rounded-lg mr-3">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  Role Change Audit Logs
                </CardTitle>
                <CardDescription>Track all role changes and system modifications</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No audit logs found</p>
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-accent/5 hover:from-accent/5 hover:to-accent/10 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center">
                            <History className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">Role Change</h4>
                            <p className="text-sm text-muted-foreground">
                              {log.metadata?.target_user_name || 'Unknown User'}: {log.old_values?.role} → {log.new_values?.role}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {log.event_type}
                          </Badge>
                          <Badge variant={log.old_values?.role === 'admin' ? 'destructive' : 'default'} className="text-xs">
                            From: {log.old_values?.role}
                          </Badge>
                          <Badge variant={log.new_values?.role === 'admin' ? 'destructive' : 'default'} className="text-xs">
                            To: {log.new_values?.role}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <ApprovalWorkflow userRole={userRole || 'staff'} />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Role & Permission System
              </CardTitle>
              <CardDescription>Visual role indicators and permission matrix</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Your Current Role</h4>
                <RoleIndicator 
                  role={userRole as any} 
                  variant="full" 
                  showPermissions={true}
                  userName={users.find(u => u.user_id === userRole)?.full_name}
                />
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">All Role Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <RoleIndicator role="admin" variant="full" showPermissions={true} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <RoleIndicator role="management" variant="full" showPermissions={true} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <RoleIndicator role="staff" variant="full" showPermissions={true} />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {userRole && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-4">Your Permission Matrix</h4>
                    <PermissionMatrix userRole={userRole} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Audit Trail for Admins */}
      {userRole === 'admin' && (
        <div className="mt-8">
          <AdvancedAuditTrail userRole={userRole} />
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      <RoleChangeConfirmationModal
        isOpen={confirmationModal.isOpen}
        onConfirm={proceedWithRoleChange}
        onCancel={() => setConfirmationModal({ isOpen: false, user: null, newRole: 'staff' })}
        user={confirmationModal.user}
        newRole={confirmationModal.newRole}
        isLoading={roleUpdateLoading}
      />

      {/* Password Confirmation Modal */}
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