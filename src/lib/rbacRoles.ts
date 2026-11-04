/**
 * Shared RBAC role constants — the single source of truth for role-name
 * sets used by the client. These mirror the SECURITY DEFINER helpers in
 * the database (user_is_field_scoped / user_is_program_scoped); if a role
 * list changes here it MUST change in supabase/migrations SQL too, and
 * vice versa. Comparisons are lowercase-normalised (guardrail: never
 * compare raw enum strings).
 */

export const PROGRAM_MANAGER_ROLE = 'program_manager' as const;

/** Roles whose holders are scoped to assigned work only (DB: user_is_field_scoped). */
export const STAFF_SCOPED_ROLE_NAMES = ['field_officer', 'data_entry', 'staff_member'] as const;

/** Route of the operational staff portal (field staff land here by default). */
export const STAFF_PORTAL_PATH = '/workspace';

const normalise = (role: string) => role.trim().toLowerCase();

/**
 * True when the user holds at least one active RBAC role and every role
 * they hold is in the staff-scoped set. Mirrors user_has_only_roles in SQL.
 */
export function isStaffScopedRoleSet(roleNames: string[]): boolean {
  if (roleNames.length === 0) return false;
  return roleNames.every((r) =>
    (STAFF_SCOPED_ROLE_NAMES as readonly string[]).includes(normalise(r))
  );
}

/**
 * True when the user holds only the Program Manager role (no broader role).
 * Mirrors user_is_program_scoped in SQL (org elevation is checked server-side).
 */
export function isProgramScopedRoleSet(roleNames: string[]): boolean {
  if (roleNames.length === 0) return false;
  return roleNames.every((r) => normalise(r) === PROGRAM_MANAGER_ROLE);
}
