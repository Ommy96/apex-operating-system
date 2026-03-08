import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, Trash2, Clock, Mail, Send, Loader2, X, Lock, ExternalLink, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface Props {
  section: 'user-roles' | 'user-settings' | 'user-security';
}

export function UserAccessSettings({ section }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { can, isSuperAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = can.manageSettings || isSuperAdmin;
  const orgId = currentOrganization?.organization_id ?? null;

  useRealtimeSubscription([
    { table: 'organization_members', queryKeys: [['organization-members', orgId!]], orgId, enabled: !!orgId && section === 'user-settings' },
    { table: 'profiles', queryKeys: [['organization-members', orgId!]], enabled: !!orgId && section === 'user-settings' },
    { table: 'organization_invitations', queryKeys: [['organization-invitations', orgId!]], orgId, enabled: !!orgId && isAdmin && section === 'user-settings' },
    { table: 'rbac_user_role_assignments', queryKeys: [['organization-members', orgId!]], orgId, enabled: !!orgId && section === 'user-settings' },
  ]);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['organization-members', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const orgId = currentOrganization.organization_id;

      // Fetch from both organization_members and rbac_user_role_assignments
      const [membersRes, assignmentsRes, rbacRolesRes] = await Promise.all([
        supabase.from('organization_members').select('*').eq('organization_id', orgId).order('role', { ascending: true }),
        supabase.from('rbac_user_role_assignments').select('user_id, role_id').eq('organization_id', orgId).eq('is_active', true),
        supabase.from('rbac_roles').select('id, name, display_name, color').eq('is_active', true),
      ]);

      if (membersRes.error) throw membersRes.error;
      const orgMembers = membersRes.data || [];
      const assignments = assignmentsRes.data || [];
      const rbacRoles = rbacRolesRes.data || [];

      // Collect all unique user IDs from both tables
      const memberUserIds = new Set(orgMembers.map(m => m.user_id));
      const assignmentUserIds = new Set(assignments.map(a => a.user_id));
      const allUserIds = [...new Set([...memberUserIds, ...assignmentUserIds])];

      if (allUserIds.length === 0) return [];

      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', allUserIds);

      const roleMap = new Map(rbacRoles.map(r => [r.id, r]));
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const orgMemberMap = new Map(orgMembers.map(m => [m.user_id, m]));

      // Build unified member list
      return allUserIds.map(userId => {
        const orgMember = orgMemberMap.get(userId);
        const userRoles = assignments.filter(a => a.user_id === userId).map(a => roleMap.get(a.role_id)).filter(Boolean);
        return {
          id: orgMember?.id || `rbac-${userId}`,
          user_id: userId,
          organization_id: orgId,
          role: orgMember?.role || 'member',
          is_primary: orgMember?.is_primary ?? false,
          joined_at: orgMember?.joined_at || null,
          created_at: orgMember?.created_at || '',
          updated_at: orgMember?.updated_at || '',
          profile: profileMap.get(userId),
          rbacRoles: userRoles,
          isOrgMember: !!orgMember,
        };
      });
    },
    enabled: !!currentOrganization?.organization_id && section === 'user-settings',
  });

  const { data: invitations } = useQuery({
    queryKey: ['organization-invitations', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase.from('organization_invitations').select('*').eq('organization_id', currentOrganization.organization_id).eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id && isAdmin && section === 'user-settings',
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ memberId, userId }: { memberId: string; userId: string }) => {
      if (!currentOrganization?.organization_id) throw new Error('No org');
      const orgId = currentOrganization.organization_id;

      // Delete from organization_members (if exists — may be rbac-only user)
      if (!memberId.startsWith('rbac-')) {
        const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
        if (error) throw error;
      }

      // Also delete rbac_user_role_assignments for this user in this org
      const { error: rbacError } = await supabase
        .from('rbac_user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (rbacError) throw rbacError;
    },
    onSuccess: () => {
      toast({ title: 'Member removed' });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id || !inviteEmail) throw new Error('Missing data');
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email: inviteEmail, role: inviteRole, organization_id: currentOrganization.organization_id, organization_name: currentOrganization.organization_name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: 'Invitation sent' });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
      setInviteDialogOpen(false);
      setInviteEmail('');
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id || !newMemberEmail || !newMemberName || !newMemberPassword) throw new Error('Missing data');
      const { data, error } = await supabase.functions.invoke('create-org-member', {
        body: {
          email: newMemberEmail.trim(),
          password: newMemberPassword.trim(),
          full_name: newMemberName.trim(),
          role: newMemberRole,
          organization_id: currentOrganization.organization_id,
        },
      });
      if (error) {
        // Try to extract the JSON error message from the response
        const context = (error as any)?.context;
        if (context && typeof context.json === 'function') {
          try {
            const body = await context.json();
            throw new Error(body?.error || error.message);
          } catch (e: any) {
            if (e.message !== error.message) throw e;
          }
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: 'Member created successfully' });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      setCreateDialogOpen(false);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPassword('');
      setNewMemberRole('member');
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create member', description: err.message, variant: 'destructive' });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organization_invitations').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Invitation cancelled' });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
    },
  });

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (section === 'user-roles') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Role Management</CardTitle>
                <CardDescription>Create, edit, and manage roles with granular permissions</CardDescription>
              </div>
              <Button onClick={() => navigate('/role-management')} className="gap-2">
                <Shield className="h-4 w-4" /> Open Role Manager
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'System Roles', desc: 'Pre-defined roles (Admin, Manager, Officer, etc.)', count: 6 },
                { label: 'Custom Roles', desc: 'Organization-specific roles you create', count: 0 },
                { label: 'Permission Groups', desc: '8 module groups with granular actions', count: 8 },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-xl border bg-muted/20">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  <Badge variant="secondary" className="mt-2">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (section === 'user-security') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Security Controls</CardTitle>
            <CardDescription>Password policies, login restrictions, and API access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'enforce2fa', label: 'Enforce Two-Factor Authentication', desc: 'Require all users to enable 2FA' },
              { key: 'passwordExpiry', label: 'Password Expiry (90 days)', desc: 'Force password changes every 90 days' },
              { key: 'loginAttemptLimit', label: 'Login Attempt Limiting', desc: 'Lock accounts after 5 failed attempts' },
              { key: 'sessionTimeout', label: 'Auto Session Timeout', desc: 'Automatically log out after 30 minutes of inactivity' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch disabled={!isAdmin} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">API Key Management</CardTitle>
            <CardDescription>Manage API keys for external integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Public API Access</p>
                  <p className="text-xs text-muted-foreground">Generate API keys for external system access</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled={!isAdmin}>Generate Key</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // user-settings: Members & Invitations
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Organization Members</CardTitle>
              <CardDescription>Manage team members and their access</CardDescription>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><UserPlus className="h-4 w-4" /> Create Member</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a New Member</DialogTitle>
                      <DialogDescription>Create an account and add them to {currentOrganization?.organization_name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input placeholder="John Doe" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input type="email" placeholder="member@example.com" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" placeholder="Min 6 characters" value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newMemberRole} onValueChange={setNewMemberRole}>
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
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                      <Button onClick={() => createMemberMutation.mutate()} disabled={createMemberMutation.isPending || !newMemberEmail || !newMemberName || !newMemberPassword} className="gap-2">
                        {createMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Create Member
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2"><Send className="h-4 w-4" /> Invite Member</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite a New Member</DialogTitle>
                      <DialogDescription>Send an invitation to join {currentOrganization?.organization_name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
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
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border hover:bg-muted/30 transition-colors flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {member.profile?.full_name ? getInitials(member.profile.full_name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {member.rbacRoles?.map((role: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs" style={{ borderLeft: `3px solid ${role.color}` }}>
                        {role.display_name}
                      </Badge>
                    ))}
                    {member.user_id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                    {isAdmin && member.user_id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>Remove {member.profile?.full_name} from this organization?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeMemberMutation.mutate(member.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground text-sm">No members found</p>
          )}

          {isAdmin && invitations && invitations.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pending Invitations</span>
                  <Badge variant="secondary" className="text-xs">{invitations.length}</Badge>
                </div>
                {invitations.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback><Mail className="h-4 w-4" /></AvatarFallback></Avatar>
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">Invited as {inv.role} • Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelInviteMutation.mutate(inv.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
