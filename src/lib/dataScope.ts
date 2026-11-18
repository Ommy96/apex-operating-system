/** Role data scope — mirrors the rbac_roles.data_scope CHECK constraint. */
export const DATA_SCOPE = {
  ORGANIZATION: 'organization',
  PROGRAM: 'program',
  PROJECT: 'project',
  ASSIGNED: 'assigned',
} as const;
export type DataScope = (typeof DATA_SCOPE)[keyof typeof DATA_SCOPE];
export const DEFAULT_CUSTOM_ROLE_SCOPE: DataScope = DATA_SCOPE.ASSIGNED;

export const DATA_SCOPE_OPTIONS: Array<{ value: DataScope; label: string; hint: string }> = [
  { value: DATA_SCOPE.ORGANIZATION, label: 'Whole organisation', hint: 'Sees every record in the organisation' },
  { value: DATA_SCOPE.PROGRAM, label: 'Assigned programmes', hint: 'Sees records in programmes they are assigned to' },
  { value: DATA_SCOPE.PROJECT, label: 'Assigned projects', hint: 'Sees records in projects they are assigned to' },
  { value: DATA_SCOPE.ASSIGNED, label: 'Assigned work only', hint: 'Sees records in their assigned projects' },
];

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** Union semantics, matching app_private.effective_beneficiary_visibility. */
export function resolveViewScope(scopes: Array<string | null | undefined>, elevated: boolean): 'organization' | 'program' | 'project' | 'none' {
  if (elevated) return 'organization';
  const s = scopes.map(norm);
  if (s.includes(DATA_SCOPE.ORGANIZATION)) return 'organization';
  if (s.includes(DATA_SCOPE.PROGRAM)) return 'program';
  if (s.includes(DATA_SCOPE.PROJECT) || s.includes(DATA_SCOPE.ASSIGNED)) return 'project';
  return 'none';
}
