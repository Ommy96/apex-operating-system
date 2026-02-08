import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Permission {
  id: string;
  module: string;
  module_display_name: string;
  action: string;
  resource: string;
  display_name: string;
  description: string;
  sort_order: number;
}

interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
}

interface PermissionMatrixProps {
  roleId: string;
  roleName: string;
  isSystemRole: boolean;
  isEditable: boolean;
}

export function PermissionMatrix({ roleId, roleName, isSystemRole, isEditable }: PermissionMatrixProps) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: allPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['rbac-all-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rbac_permissions')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Permission[];
    },
  });

  const { data: rolePermissions = [], isLoading: rpLoading } = useQuery({
    queryKey: ['rbac-role-permissions', roleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rbac_role_permissions')
        .select('*')
        .eq('role_id', roleId);
      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!roleId,
  });

  const grantedIds = useMemo(
    () => new Set(rolePermissions.map(rp => rp.permission_id)),
    [rolePermissions]
  );

  const togglePermission = useMutation({
    mutationFn: async ({ permissionId, granted }: { permissionId: string; granted: boolean }) => {
      if (granted) {
        const { error } = await supabase
          .from('rbac_role_permissions')
          .insert({ role_id: roleId, permission_id: permissionId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rbac_role_permissions')
          .delete()
          .eq('role_id', roleId)
          .eq('permission_id', permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-role-permissions', roleId] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Group permissions by module
  const grouped = useMemo(() => {
    const filtered = allPermissions.filter(p =>
      !search || p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.module_display_name.toLowerCase().includes(search.toLowerCase())
    );
    const groups: Record<string, { displayName: string; permissions: Permission[] }> = {};
    filtered.forEach(p => {
      if (!groups[p.module]) {
        groups[p.module] = { displayName: p.module_display_name, permissions: [] };
      }
      groups[p.module].permissions.push(p);
    });
    return groups;
  }, [allPermissions, search]);

  const isLoading = permsLoading || rpLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPerms = allPermissions.length;
  const grantedCount = grantedIds.size;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {grantedCount}/{totalPerms} permissions
          </Badge>
          {isSystemRole && (
            <Badge variant="secondary" className="text-xs">System Role</Badge>
          )}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter permissions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Matrix */}
      <ScrollArea className="h-[500px] rounded-lg border">
        <div className="p-4 space-y-6">
          {Object.entries(grouped).map(([module, group]) => (
            <div key={module}>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                {group.displayName}
              </h4>
              <div className="grid gap-2 pl-4">
                {group.permissions.map(perm => {
                  const granted = grantedIds.has(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Checkbox
                        checked={granted}
                        disabled={!isEditable || togglePermission.isPending}
                        onCheckedChange={(checked) => {
                          togglePermission.mutate({
                            permissionId: perm.id,
                            granted: !!checked,
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{perm.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {perm.action}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-center text-muted-foreground py-8">No permissions match your search.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
