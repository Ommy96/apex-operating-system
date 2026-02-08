import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Settings as SettingsIcon, 
  Save, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  UserPlus,
  Shield,
  Trash2,
  Crown,
  Loader2,
  User,
  Bell,
  Sun,
  Moon,
  Monitor,
  Clock,
  Send,
  X,
  Home,
  School,
  Briefcase,
  FileText,
  Trophy,
  GraduationCap,
  ClipboardList,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PageHeroHeader } from '@/components/PageHeroHeader';

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  is_primary: boolean;
  joined_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
  rbacRoles?: { display_name: string; color: string; role_name: string }[];
}

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  settings: Record<string, any> | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function OrganizationSettings() {
  const { user, userRole } = useAuth();
  const { currentOrganization, refreshOrganization } = useOrganization();
  const { roles: myRbacRoles, primaryRole, can, isSuperAdmin } = usePermissions();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [orgDetails, setOrgDetails] = useState<Partial<OrganizationDetails>>({});
  const [orgSettings, setOrgSettings] = useState({
    allowMemberInvites: false,
    requireApprovalForChanges: true,
    enableAuditLog: true,
    enabledReportTypes: {
      homeVisits: true,
      schoolVisits: true,
      businessVisits: true,
      programReports: true,
      activityReports: true,
      academicPerformance: true,
      customReports: true,
      otherReports: true,
    },
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    activityAlerts: true,
    weeklyDigest: false,
  });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const isOrgAdmin = can.manageSettings || isSuperAdmin;

  // Fetch organization details
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['organization-details', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', currentOrganization.organization_id)
        .single();
      if (error) throw error;
      return data as OrganizationDetails;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch organization members with RBAC roles
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['organization-members', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const orgId = currentOrganization.organization_id;

      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .order('role', { ascending: true });
      if (error) throw error;

      const memberIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', memberIds);

      // Fetch RBAC role assignments for all members
      const { data: assignments } = await supabase
        .from('rbac_user_role_assignments')
        .select('user_id, role_id')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      const { data: rbacRoles } = await supabase
        .from('rbac_roles')
        .select('id, name, display_name, color')
        .eq('is_active', true);

      const roleMap = new Map(rbacRoles?.map(r => [r.id, r]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(member => {
        const memberAssignments = (assignments || [])
          .filter(a => a.user_id === member.user_id)
          .map(a => {
            const role = roleMap.get(a.role_id);
            return role ? { display_name: role.display_name, color: role.color, role_name: role.name } : null;
          })
          .filter(Boolean);

        return {
          ...member,
          profile: profileMap.get(member.user_id),
          rbacRoles: memberAssignments,
        };
      }) as OrganizationMember[];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch pending invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['organization-invitations', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PendingInvitation[];
    },
    enabled: !!currentOrganization?.organization_id && isOrgAdmin,
  });

  useEffect(() => {
    if (organization) {
      setOrgDetails({
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        country: organization.country,
        website: organization.website,
        description: organization.description,
      });
      if (organization.settings) {
        setOrgSettings(prev => ({ ...prev, ...organization.settings }));
      }
    }
  }, [organization]);

  const saveDetailsMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgDetails.name, email: orgDetails.email, phone: orgDetails.phone,
          address: orgDetails.address, country: orgDetails.country, website: orgDetails.website,
          description: orgDetails.description, settings: orgSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentOrganization.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Organization details saved' });
      queryClient.invalidateQueries({ queryKey: ['organization-details'] });
      refreshOrganization();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Member removed from organization' });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');
      if (!inviteEmail) throw new Error('Email is required');
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteEmail, role: inviteRole,
          organization_id: currentOrganization.organization_id,
          organization_name: currentOrganization.organization_name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Invitation sent successfully' });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Invitation cancelled' });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeroHeader
        title="Organization Settings"
        description={`Manage settings for ${currentOrganization.organization_name}`}
        icon={Building2}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto h-12 items-center justify-center rounded-xl bg-muted/60 p-1.5 backdrop-blur-sm gap-1">
            <TabsTrigger value="profile" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="details" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Building2 className="h-4 w-4 mr-2" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="members" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 mr-2" />
              Members
              {members && <Badge variant="secondary" className="ml-2 h-5">{members.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="settings" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{user?.email?.split('@')[0] || 'Your Profile'}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input id="email" value={user?.email || ''} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Organization</Label>
                  <Input value={currentOrganization?.organization_name || ''} disabled className="bg-muted/50" />
                </div>
              </div>
              
              {/* RBAC Roles Display */}
              <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Your Roles & Permissions</p>
                    <p className="text-xs text-muted-foreground">Access levels assigned to you in this organization</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {myRbacRoles.length > 0 ? (
                    myRbacRoles.map((role) => (
                      <Badge
                        key={role.role_id}
                        variant="secondary"
                        className="text-sm px-3 py-1"
                        style={{ borderLeft: `3px solid ${role.color}` }}
                      >
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

              {/* Theme Toggle */}
              <div className="p-4 rounded-xl bg-muted/30 border space-y-4">
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
              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive important updates via email' },
                { key: 'activityAlerts', label: 'Activity Alerts', desc: 'Get notified about new activities and events' },
                { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Receive a weekly summary of activities' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={(notificationSettings as any)[item.key]}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, [item.key]: checked }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <Building2 className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Organization Details</CardTitle>
                  <CardDescription>Basic information about your organization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {orgLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    {[
                      { id: 'orgName', label: 'Organization Name', icon: Building2, key: 'name', placeholder: 'Enter organization name' },
                      { id: 'orgEmail', label: 'Contact Email', icon: Mail, key: 'email', placeholder: 'contact@organization.com', type: 'email' },
                      { id: 'phone', label: 'Phone Number', icon: Phone, key: 'phone', placeholder: '+254 xxx xxx xxx' },
                      { id: 'website', label: 'Website', icon: Globe, key: 'website', placeholder: 'https://www.organization.com' },
                      { id: 'country', label: 'Country', icon: Globe, key: 'country', placeholder: 'Kenya' },
                    ].map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id} className="text-sm font-medium flex items-center gap-2">
                          <field.icon className="h-4 w-4 text-muted-foreground" />
                          {field.label}
                        </Label>
                        <Input
                          id={field.id}
                          type={field.type || 'text'}
                          value={(orgDetails as any)[field.key] || ''}
                          onChange={(e) => setOrgDetails({ ...orgDetails, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          disabled={!isOrgAdmin}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" /> Address
                    </Label>
                    <Textarea id="address" value={orgDetails.address || ''} onChange={(e) => setOrgDetails({ ...orgDetails, address: e.target.value })} placeholder="Enter organization address" rows={2} disabled={!isOrgAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Textarea id="description" value={orgDetails.description || ''} onChange={(e) => setOrgDetails({ ...orgDetails, description: e.target.value })} placeholder="Brief description of your organization" rows={3} disabled={!isOrgAdmin} />
                  </div>
                  {isOrgAdmin && (
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => saveDetailsMutation.mutate()} disabled={saveDetailsMutation.isPending} className="gap-2">
                        {saveDetailsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center shadow-lg">
                    <Users className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Organization Members</CardTitle>
                    <CardDescription>Manage team members and their roles</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(can.manageRoles || can.manageCustomRoles) && (
                    <Button variant="outline" className="gap-2" onClick={() => navigate('/role-management')}>
                      <Lock className="h-4 w-4" />
                      Manage Roles
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  {isOrgAdmin && (
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <UserPlus className="h-4 w-4" /> Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite a New Member</DialogTitle>
                          <DialogDescription>Send an invitation to join {currentOrganization?.organization_name}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input id="invite-email" type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invite-role">Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                          <Button onClick={() => sendInviteMutation.mutate()} disabled={sendInviteMutation.isPending || !inviteEmail} className="gap-2">
                            {sendInviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Send Invitation
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : members && members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border hover:bg-muted/50 transition-colors flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {member.profile?.full_name ? getInitials(member.profile.full_name) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.profile?.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">{member.profile?.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Show RBAC roles */}
                        {member.rbacRoles && member.rbacRoles.length > 0 ? (
                          member.rbacRoles.map((role, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs" style={{ borderLeft: `3px solid ${role.color}` }}>
                              {role.display_name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" /> No RBAC role
                          </Badge>
                        )}
                        
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}

                        {isOrgAdmin && member.user_id !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.profile?.full_name} from this organization?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeMemberMutation.mutate(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No members found</div>
              )}

              {/* Pending Invitations */}
              {isOrgAdmin && invitations && invitations.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-medium">Pending Invitations</h3>
                      <Badge variant="secondary">{invitations.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {invitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-accent text-accent-foreground font-medium">
                                <Mail className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Invited as <span className="capitalize">{invitation.role}</span> • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">Pending</Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => cancelInviteMutation.mutate(invitation.id)} disabled={cancelInviteMutation.isPending}>
                              {cancelInviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg">
                  <SettingsIcon className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Organization Configuration</CardTitle>
                  <CardDescription>Configure organization-specific settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'allowMemberInvites', label: 'Allow Member Invites', desc: 'Allow admins to invite new members to the organization' },
                { key: 'requireApprovalForChanges', label: 'Require Approval for Changes', desc: 'Staff changes require admin approval before being applied' },
                { key: 'enableAuditLog', label: 'Enable Audit Log', desc: 'Track all changes made within the organization' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={(orgSettings as any)[item.key]}
                    onCheckedChange={(checked) => setOrgSettings(prev => ({ ...prev, [item.key]: checked }))}
                    disabled={!isOrgAdmin}
                  />
                </div>
              ))}

              <Separator className="my-6" />

              {/* Report Types Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Enabled Report Types</p>
                    <p className="text-xs text-muted-foreground">Choose which report types are available for your organization</p>
                  </div>
                </div>
                
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { key: 'homeVisits', label: 'Home Visits', icon: Home },
                    { key: 'schoolVisits', label: 'School Visits', icon: School },
                    { key: 'businessVisits', label: 'Business Visits', icon: Briefcase },
                    { key: 'programReports', label: 'Program Reports', icon: FileText },
                    { key: 'activityReports', label: 'Activity Reports', icon: Trophy },
                    { key: 'academicPerformance', label: 'Academic Performance', icon: GraduationCap },
                    { key: 'customReports', label: 'Custom Reports', icon: ClipboardList },
                    { key: 'otherReports', label: 'Other Reports', icon: FileText },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">{item.label}</Label>
                      </div>
                      <Switch
                        checked={orgSettings.enabledReportTypes?.[item.key as keyof typeof orgSettings.enabledReportTypes] ?? true}
                        onCheckedChange={(checked) =>
                          setOrgSettings(prev => ({
                            ...prev,
                            enabledReportTypes: { ...prev.enabledReportTypes, [item.key]: checked },
                          }))
                        }
                        disabled={!isOrgAdmin}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {isOrgAdmin && (
                <div className="flex justify-end pt-4">
                  <Button onClick={() => saveDetailsMutation.mutate()} disabled={saveDetailsMutation.isPending} className="gap-2">
                    {saveDetailsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Configuration
                  </Button>
                </div>
              )}

              <Separator className="my-6" />

              {/* Your Role Card */}
              <div className="p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Your Roles</p>
                    <p className="text-xs text-muted-foreground">Your assigned roles in this organization</p>
                  </div>
                  {(can.manageRoles || can.manageCustomRoles) && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/role-management')} className="text-xs gap-1">
                      <Lock className="h-3 w-3" /> Manage Roles
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {myRbacRoles.length > 0 ? (
                    myRbacRoles.map((role) => (
                      <Badge key={role.role_id} variant="secondary" className="text-sm px-3 py-1" style={{ borderLeft: `3px solid ${role.color}` }}>
                        {role.display_name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="capitalize gap-1">
                      {isSuperAdmin ? 'Super Admin' : currentOrganization.user_role}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
