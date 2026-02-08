import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, UserPlus, Shield, Loader2, X, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MemberWithRoles {
  user_id: string;
  full_name: string;
  email: string;
  roles: { role_id: string; role_name: string; display_name: string; color: string; assignment_id: string }[];
  joined_at: string;
}

export function UserRoleAssignment() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [assignDialog, setAssignDialog] = useState<{ userId: string; name: string } | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // Fetch members with their RBAC roles
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['rbac-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Get org members
      const { data: orgMembers, error: memErr } = await supabase
        .from('organization_members')
        .select('user_id, joined_at')
        .eq('organization_id', orgId);
      if (memErr) throw memErr;

      // Get profiles
      const userIds = orgMembers.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Get RBAC assignments
      const { data: assignments } = await supabase
        .from('rbac_user_role_assignments')
        .select('id, user_id, role_id')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      // Get roles for display
      const { data: roles } = await supabase
        .from('rbac_roles')
        .select('id, name, display_name, color')
        .or(`is_system_role.eq.true,organization_id.eq.${orgId}`);

      const roleMap = new Map(roles?.map(r => [r.id, r]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return orgMembers.map(m => {
        const profile = profileMap.get(m.user_id);
        const userAssignments = (assignments || [])
          .filter(a => a.user_id === m.user_id)
          .map(a => {
            const role = roleMap.get(a.role_id);
            return role ? {
              role_id: a.role_id,
              role_name: role.name,
              display_name: role.display_name,
              color: role.color,
              assignment_id: a.id,
            } : null;
          })
          .filter(Boolean) as MemberWithRoles['roles'];

        return {
          user_id: m.user_id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          roles: userAssignments,
          joined_at: m.joined_at,
        };
      }) as MemberWithRoles[];
    },
    enabled: !!orgId,
  });

  // Available roles
  const { data: availableRoles = [] } = useQuery({
    queryKey: ['rbac-available-roles', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rbac_roles')
        .select('id, name, display_name, color, is_system_role')
        .eq('is_active', true)
        .or(`is_system_role.eq.true,organization_id.eq.${orgId}`)
        .neq('name', 'super_admin')
        .order('display_name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('rbac_user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          organization_id: orgId,
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Role assigned successfully' });
      queryClient.invalidateQueries({ queryKey: ['rbac-members', orgId] });
      setAssignDialog(null);
      setSelectedRoleId('');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const removeRole = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('rbac_user_role_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Role removed' });
      queryClient.invalidateQueries({ queryKey: ['rbac-members', orgId] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const filtered = members.filter(m =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  if (membersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{members.length} members</Badge>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {filtered.map(member => (
            <Card key={member.user_id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {member.roles.map(role => (
                      <Badge
                        key={role.assignment_id}
                        variant="secondary"
                        className="text-xs flex items-center gap-1"
                        style={{ borderLeft: `3px solid ${role.color}` }}
                      >
                        {role.display_name}
                        <button
                          onClick={() => removeRole.mutate(role.assignment_id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {member.roles.length === 0 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        No role
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignDialog({ userId: member.user_id, name: member.full_name })}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Assign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Assign Role Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => { setAssignDialog(null); setSelectedRoleId(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Assign Role to {assignDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} />
                    {role.display_name}
                    {role.is_system_role && <Badge variant="outline" className="text-[10px] ml-1">System</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button
              disabled={!selectedRoleId || assignRole.isPending}
              onClick={() => {
                if (assignDialog && selectedRoleId) {
                  assignRole.mutate({ userId: assignDialog.userId, roleId: selectedRoleId });
                }
              }}
            >
              {assignRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
