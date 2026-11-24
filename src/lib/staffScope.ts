/** Shared constants for staff scope (mirrors departments.data_reach CHECK and app_private.user_has_org_reach). */
export const DEPARTMENT_DATA_REACH = { ORGANIZATION: 'organization', PROGRAMMES: 'programmes' } as const;
export type DepartmentDataReach = typeof DEPARTMENT_DATA_REACH[keyof typeof DEPARTMENT_DATA_REACH];

export const DEPARTMENT_MODULES = [
  { value: 'beneficiaries', label: 'Beneficiaries (read)' },
  { value: 'indicators', label: 'Indicators & M&E' },
  { value: 'results', label: 'Results' },
  { value: 'reports', label: 'Reports' },
  { value: 'data_quality', label: 'Data quality' },
  { value: 'activities', label: 'Activities' },
  { value: 'field_logs', label: 'Field logs' },
  { value: 'grants', label: 'Grants' },
  { value: 'budgets', label: 'Budgets' },
  { value: 'donations', label: 'Donations' },
] as const;

export const WORKSPACE_PATH = '/workspace';
export const ORG_DASHBOARD_PATH = '/dashboard';

export function isReach(value: string | null | undefined, reach: DepartmentDataReach): boolean {
  return (value ?? '').toLowerCase() === reach.toLowerCase();
}

/** Where a signed-in user belongs: org reach → dashboard, everyone else → their workspace. */
export function landingPathFor(orgReach: boolean): string {
  return orgReach ? ORG_DASHBOARD_PATH : WORKSPACE_PATH;
}

export interface ScopeHeadlineInput {
  firstName: string;
  hour: number;
  programmes: string[];
  projects: string[];
  departments: string[];
}

export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Good evening, Sylvester · Your programmes: A · Your projects: B, C · Department: M&E" */
export function buildScopeHeadline(i: ScopeHeadlineInput): string {
  const parts = [`${greetingFor(i.hour)}, ${i.firstName}`];
  if (i.programmes.length) parts.push(`Your programmes: ${i.programmes.join(', ')}`);
  if (i.projects.length) parts.push(`Your projects: ${i.projects.join(', ')}`);
  if (i.departments.length) parts.push(`Department: ${i.departments.join(', ')}`);
  return parts.join(' · ');
}

export function hasAnyLink(s: { programIds: string[]; projectIds: string[]; departmentIds: string[] }): boolean {
  return s.programIds.length + s.projectIds.length + s.departmentIds.length > 0;
}

export const EMPTY_WORKSPACE_MESSAGE =
  'You have not been assigned to a programme, project or department yet. Ask your administrator to add you.';
export const EMPTY_WORKSPACE_WARNING = 'Will see an empty workspace.';
