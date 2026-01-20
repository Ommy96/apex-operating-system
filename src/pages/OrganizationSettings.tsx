import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
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
  ClipboardList
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
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  
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

  const isOrgAdmin = currentOrganization?.user_role === 'owner' || 
                     currentOrganization?.user_role === 'admin' ||
                     userRole === 'admin';

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

  // Fetch organization members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['organization-members', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .order('role', { ascending: true });
      
      if (error) throw error;

      // Fetch profiles for each member
      const memberIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(member => ({
        ...member,
        profile: profileMap.get(member.user_id),
      })) as OrganizationMember[];
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

  // Update org details when data loads
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
        setOrgSettings(prev => ({
          ...prev,
          ...organization.settings,
        }));
      }
    }
  }, [organization]);

  // Save organization details mutation
  const saveDetailsMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgDetails.name,
          email: orgDetails.email,
          phone: orgDetails.phone,
          address: orgDetails.address,
          country: orgDetails.country,
          website: orgDetails.website,
          description: orgDetails.description,
          settings: orgSettings,
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
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save organization details',
        variant: 'destructive'
      });
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Member role updated' });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update member role',
        variant: 'destructive'
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Member removed from organization' });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to remove member',
        variant: 'destructive'
      });
    },
  });

  // Send invitation mutation
  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');
      if (!inviteEmail) throw new Error('Email is required');

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteEmail,
          role: inviteRole,
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
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send invitation',
        variant: 'destructive'
      });
    },
  });

  // Cancel invitation mutation
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
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to cancel invitation',
        variant: 'destructive'
      });
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'destructive';
      case 'manager': return 'secondary';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="h-3 w-3" />;
    if (role === 'admin') return <Shield className="h-3 w-3" />;
    return null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
        <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted/60 p-1.5 backdrop-blur-sm flex-wrap gap-1">
          <TabsTrigger 
            value="profile" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="notifications"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger 
            value="members"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Members
            {members && <Badge variant="secondary" className="ml-2 h-5">{members.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger 
            value="settings"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
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
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Organization</Label>
                  <Input
                    value={currentOrganization?.organization_name || ''}
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

              {/* Theme Toggle Section */}
              <div className="p-4 rounded-xl bg-muted/30 border space-y-4">
                <div className="flex items-center gap-3">
                  <Sun className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Appearance</p>
                    <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="flex-1 gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="flex-1 gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    className="flex-1 gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
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
                    <div className="space-y-2">
                      <Label htmlFor="orgName" className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        Organization Name
                      </Label>
                      <Input
                        id="orgName"
                        value={orgDetails.name || ''}
                        onChange={(e) => setOrgDetails({ ...orgDetails, name: e.target.value })}
                        placeholder="Enter organization name"
                        disabled={!isOrgAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Contact Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={orgDetails.email || ''}
                        onChange={(e) => setOrgDetails({ ...orgDetails, email: e.target.value })}
                        placeholder="contact@organization.com"
                        disabled={!isOrgAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={orgDetails.phone || ''}
                        onChange={(e) => setOrgDetails({ ...orgDetails, phone: e.target.value })}
                        placeholder="+254 xxx xxx xxx"
                        disabled={!isOrgAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        Website
                      </Label>
                      <Input
                        id="website"
                        value={orgDetails.website || ''}
                        onChange={(e) => setOrgDetails({ ...orgDetails, website: e.target.value })}
                        placeholder="https://www.organization.com"
                        disabled={!isOrgAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        Country
                      </Label>
                      <Input
                        id="country"
                        value={orgDetails.country || ''}
                        onChange={(e) => setOrgDetails({ ...orgDetails, country: e.target.value })}
                        placeholder="Kenya"
                        disabled={!isOrgAdmin}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Address
                    </Label>
                    <Textarea
                      id="address"
                      value={orgDetails.address || ''}
                      onChange={(e) => setOrgDetails({ ...orgDetails, address: e.target.value })}
                      placeholder="Enter organization address"
                      rows={2}
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={orgDetails.description || ''}
                      onChange={(e) => setOrgDetails({ ...orgDetails, description: e.target.value })}
                      placeholder="Brief description of your organization"
                      rows={3}
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  {isOrgAdmin && (
                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={() => saveDetailsMutation.mutate()}
                        disabled={saveDetailsMutation.isPending}
                        className="gap-2"
                      >
                        {saveDetailsMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center shadow-lg">
                    <Users className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Organization Members</CardTitle>
                    <CardDescription>Manage team members and their roles</CardDescription>
                  </div>
                </div>
                {isOrgAdmin && (
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite a New Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join {currentOrganization?.organization_name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-email">Email Address</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            placeholder="colleague@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="invite-role">Role</Label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => sendInviteMutation.mutate()}
                          disabled={sendInviteMutation.isPending || !inviteEmail}
                          className="gap-2"
                        >
                          {sendInviteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send Invitation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
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
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border hover:bg-muted/50 transition-colors"
                    >
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
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                        
                        {isOrgAdmin && member.user_id !== user?.id && member.role !== 'owner' && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(value) => updateRoleMutation.mutate({ 
                                memberId: member.id, 
                                newRole: value 
                              })}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {member.profile?.full_name} from this organization? 
                                    They will lose access to all organization data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeMemberMutation.mutate(member.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                        
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No members found
                </div>
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
                        <div 
                          key={invitation.id} 
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-accent text-accent-foreground font-medium">
                                <Mail className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Invited as <span className="capitalize">{invitation.role}</span> • 
                                Expires {new Date(invitation.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              Pending
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => cancelInviteMutation.mutate(invitation.id)}
                              disabled={cancelInviteMutation.isPending}
                            >
                              {cancelInviteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Allow Member Invites</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow admins to invite new members to the organization
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.allowMemberInvites}
                    onCheckedChange={(checked) => 
                      setOrgSettings({ ...orgSettings, allowMemberInvites: checked })
                    }
                    disabled={!isOrgAdmin}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Require Approval for Changes</Label>
                    <p className="text-xs text-muted-foreground">
                      Staff changes require admin approval before being applied
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.requireApprovalForChanges}
                    onCheckedChange={(checked) => 
                      setOrgSettings({ ...orgSettings, requireApprovalForChanges: checked })
                    }
                    disabled={!isOrgAdmin}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Enable Audit Log</Label>
                    <p className="text-xs text-muted-foreground">
                      Track all changes made within the organization
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.enableAuditLog}
                    onCheckedChange={(checked) => 
                      setOrgSettings({ ...orgSettings, enableAuditLog: checked })
                    }
                    disabled={!isOrgAdmin}
                  />
                </div>
              </div>

              {/* Report Types Section */}
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Enabled Report Types</p>
                    <p className="text-xs text-muted-foreground">Choose which report types are available for your organization</p>
                  </div>
                </div>
                
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Home Visits</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.homeVisits ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            homeVisits: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">School Visits</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.schoolVisits ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            schoolVisits: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Business Visits</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.businessVisits ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            businessVisits: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Program Reports</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.programReports ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            programReports: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Activity Reports</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.activityReports ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            activityReports: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Academic Performance</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.academicPerformance ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            academicPerformance: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Custom Reports</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.customReports ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            customReports: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Other Reports</Label>
                    </div>
                    <Switch
                      checked={orgSettings.enabledReportTypes?.otherReports ?? true}
                      onCheckedChange={(checked) => 
                        setOrgSettings({ 
                          ...orgSettings, 
                          enabledReportTypes: { 
                            ...orgSettings.enabledReportTypes, 
                            otherReports: checked 
                          } 
                        })
                      }
                      disabled={!isOrgAdmin}
                    />
                  </div>
                </div>
              </div>

              {isOrgAdmin && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => saveDetailsMutation.mutate()}
                    disabled={saveDetailsMutation.isPending}
                    className="gap-2"
                  >
                    {saveDetailsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Configuration
                  </Button>
                </div>
              )}

              <Separator className="my-6" />

              <div className="p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Your Role</p>
                    <p className="text-xs text-muted-foreground">Your current role in this organization</p>
                  </div>
                </div>
                <Badge variant={getRoleBadgeVariant(currentOrganization.user_role)} className="capitalize gap-1">
                  {getRoleIcon(currentOrganization.user_role)}
                  {currentOrganization.user_role}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
