export const PROJECT_TEAM_ROLE = {
  LEAD: "lead",
  MEMBER: "team_member",
} as const;
export const PROGRAMME_TEAM_ROLE = { FIELD_OFFICER: "field_officer" } as const;
export const WHOLE_PROGRAMME = "__program__";
export const TEAM_TAB = "team";

export const teamValueMatches = (value: string | null | undefined, expected: string) =>
  value?.toLowerCase() === expected.toLowerCase();

export function canAssignTeam(
  can: { manageStaff: boolean; manageRoles: boolean },
  hasPermission: (module: string, action: string, resource: string) => boolean,
) {
  return can.manageStaff || can.manageRoles ||
    hasPermission("hr", "create", "staff") || hasPermission("hr", "edit", "staff");
}