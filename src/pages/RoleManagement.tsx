import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Plus,
  Copy,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Briefcase,
  UserCheck,
  BarChart3,
  PenLine,
  Lock,
} from 'lucide-react';
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix';
import { UserRoleAssignment } from '@/components/rbac/UserRoleAssignment';
import { toast } from '@/hooks/use-toast';

interface RbacRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
  color: string;
  icon: string;
  organization_id: string | null;
  created_at: string;
}

const iconMap: Record<string, any> = {
  ShieldAlert, ShieldCheck, Shield, Briefcase, UserCheck, BarChart3, PenLine, Eye, Lock,
};

function RoleIcon({ name, color }: { name: string; color: string }) {
  const Icon = iconMap[name] || Shield;
  return (
    <div
      className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
      style={{ backgroundColor: color + '20', color }}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

export default function RoleManagement() {
  const { currentOrganization } = useOrganization();
  const { can, isSuperAdmin } = usePermissions();
  const orgId = currentOrganization?.organization_id;
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<RbacRole | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '', color: '#6366f1' });

  const canManageRoles = can.manageCustomRoles || isSuperAdmin;

  // Fetch all roles (system + org-specific)
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['rbac-all-roles', orgId],
    queryFn: async () => {
      let query = supabase
        .from('rbac_roles')
        .select('*')
        .eq('is_active', true)
        .order('is_system_role', { ascending: false })
        .order('display_name');
      
      const { data, error } = await query;
      if (error) throw error;
      return (data as RbacRole[]).filter(r => 
        r.is_system_role || r.organization_id === orgId
      );
    },
    enabled: !!orgId,
  });

  // Count users per role
  const { data: roleCounts = {} } = useQuery({
    queryKey: ['rbac-role-counts', orgId],
    queryFn: async () => {
      if (!orgId) return {};
      const { data, error } = await supabase
        .from('rbac_user_role_assignments')
        .select('role_id')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(a => {
        counts[a.role_id] = (counts[a.role_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!orgId,
  });

  const createRole = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization');
      const slug = newRole.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const { error } = await supabase.from('rbac_roles').insert({
        organization_id: orgId,
        name: slug,
        display_name: newRole.display_name,
        description: newRole.description || null,
        color: newRole.color,
        is_system_role: false,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Role created successfully' });
      queryClient.invalidateQueries({ queryKey: ['rbac-all-roles'] });
      setCreateDialogOpen(false);
      setNewRole({ name: '', display_name: '', description: '', color: '#6366f1' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const cloneRole = useMutation({
    mutationFn: async (sourceRole: RbacRole) => {
      if (!orgId) throw new Error('No organization');
      // Create clone
      const { data: cloned, error: insertErr } = await supabase
        .from('rbac_roles')
        .insert({
          organization_id: orgId,
          name: sourceRole.name + '_copy',
          display_name: sourceRole.display_name + ' (Copy)',
          description: sourceRole.description,
          color: sourceRole.color,
          icon: sourceRole.icon,
          is_system_role: false,
          cloned_from: sourceRole.id,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Copy permissions
      const { data: perms } = await supabase
        .from('rbac_role_permissions')
        .select('permission_id')
        .eq('role_id', sourceRole.id);

      if (perms && perms.length > 0) {
        const { error: permErr } = await supabase
          .from('rbac_role_permissions')
          .insert(perms.map(p => ({ role_id: cloned.id, permission_id: p.permission_id })));
        if (permErr) throw permErr;
      }
    },
    onSuccess: () => {
      toast({ title: 'Role cloned successfully' });
      queryClient.invalidateQueries({ queryKey: ['rbac-all-roles'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('rbac_roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Role deleted' });
      queryClient.invalidateQueries({ queryKey: ['rbac-all-roles'] });
      setSelectedRole(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const updateRole = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      const { error } = await supabase
        .from('rbac_roles')
        .update({
          display_name: newRole.display_name,
          description: newRole.description,
          color: newRole.color,
        })
        .eq('id', selectedRole.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Role updated' });
      queryClient.invalidateQueries({ queryKey: ['rbac-all-roles'] });
      setEditDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const systemRoles = roles.filter(r => r.is_system_role);
  const customRoles = roles.filter(r => !r.is_system_role);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeroHeader
        title="Role & Access Management"
        description="Manage roles, permissions, and user assignments for your organization"
        icon={Shield}
      />

      <Tabs defaultValue="roles" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto bg-muted/60 p-1.5 rounded-xl">
            <TabsTrigger value="roles" className="rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap">
              <Shield className="h-4 w-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap">
              <Lock className="h-4 w-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap">
              <Users className="h-4 w-4 mr-2" />
              User Assignments
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          {canManageRoles && (
            <div className="flex justify-end">
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Role
              </Button>
            </div>
          )}

          {/* System Roles */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              System Roles
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {systemRoles.map(role => (
                <Card
                  key={role.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedRole?.id === role.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedRole(role)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RoleIcon name={role.icon} color={role.color} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{role.display_name}</p>
                          <Badge variant="outline" className="text-[10px]">System</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{role.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">
                            <Users className="h-3 w-3 mr-1" />
                            {roleCounts[role.id] || 0} users
                          </Badge>
                          {canManageRoles && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => { e.stopPropagation(); cloneRole.mutate(role); }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Clone
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Roles */}
          {customRoles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Custom Roles
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {customRoles.map(role => (
                  <Card
                    key={role.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedRole?.id === role.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <RoleIcon name={role.icon} color={role.color} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{role.display_name}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{role.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px]">
                              <Users className="h-3 w-3 mr-1" />
                              {roleCounts[role.id] || 0} users
                            </Badge>
                            {canManageRoles && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRole(role);
                                    setNewRole({ name: role.name, display_name: role.display_name, description: role.description || '', color: role.color });
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{role.display_name}"? Users with this role will lose their permissions.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground"
                                        onClick={() => deleteRole.mutate(role.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          {selectedRole ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <RoleIcon name={selectedRole.icon} color={selectedRole.color} />
                  <div>
                    <CardTitle>{selectedRole.display_name}</CardTitle>
                    <CardDescription>{selectedRole.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PermissionMatrix
                  roleId={selectedRole.id}
                  roleName={selectedRole.name}
                  isSystemRole={selectedRole.is_system_role}
                  isEditable={canManageRoles && !selectedRole.is_system_role}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Select a role from the Roles tab</p>
                <p className="text-sm mt-1">Then switch to this tab to view or edit its permissions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Role Assignments
              </CardTitle>
              <CardDescription>
                Assign roles to organization members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserRoleAssignment />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Define a new role with custom permissions for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input
                value={newRole.display_name}
                onChange={e => setNewRole(p => ({ ...p, display_name: e.target.value }))}
                placeholder="e.g. Senior Field Officer"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newRole.description}
                onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe what this role can do..."
                rows={3}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={newRole.color}
                  onChange={e => setNewRole(p => ({ ...p, color: e.target.value }))}
                  className="h-9 w-12 rounded cursor-pointer border-0"
                />
                <Input
                  value={newRole.color}
                  onChange={e => setNewRole(p => ({ ...p, color: e.target.value }))}
                  className="w-28"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createRole.mutate()} disabled={!newRole.display_name || createRole.isPending}>
              {createRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input
                value={newRole.display_name}
                onChange={e => setNewRole(p => ({ ...p, display_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newRole.description}
                onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={newRole.color}
                  onChange={e => setNewRole(p => ({ ...p, color: e.target.value }))}
                  className="h-9 w-12 rounded cursor-pointer border-0"
                />
                <Input
                  value={newRole.color}
                  onChange={e => setNewRole(p => ({ ...p, color: e.target.value }))}
                  className="w-28"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => updateRole.mutate()} disabled={updateRole.isPending}>
              {updateRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
