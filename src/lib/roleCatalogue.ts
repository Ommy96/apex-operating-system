export interface CatalogueRole {
  id: string;
  name: string;
  display_name: string;
  organization_id: string | null;
  is_system_role: boolean;
  created_at: string;
}

/** Keep different permission sets distinct; never union grants or change stored roles. */
export function organisationRoleCatalogue<T extends CatalogueRole>(
  roles: T[],
  organizationId: string,
  permissions: { role_id: string; permission_id: string }[],
): (T & { permissionCount: number; choiceLabel: string })[] {
  const localNames = new Set(roles.filter(r => r.organization_id === organizationId).map(r => r.name.trim().toLowerCase()));
  const eligible = roles.filter(r => r.organization_id === organizationId ||
    (r.organization_id === null && r.is_system_role && !localNames.has(r.name.trim().toLowerCase())));
  const seen = new Set<string>();
  const choices = eligible.slice().sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)).flatMap(role => {
    const grants = [...new Set(permissions.filter(p => p.role_id === role.id).map(p => p.permission_id))].sort();
    const identity = JSON.stringify([role.name.trim().toLowerCase(), grants]);
    if (role.is_system_role && seen.has(identity)) return [];
    if (role.is_system_role) seen.add(identity);
    return [{ ...role, permissionCount: grants.length, choiceLabel: role.display_name }];
  });
  return choices.map(role => ({
    ...role,
    choiceLabel: choices.filter(other => other.display_name.toLowerCase() === role.display_name.toLowerCase()).length > 1
      ? `${role.display_name} (${role.permissionCount} permissions)` : role.display_name,
  }));
}