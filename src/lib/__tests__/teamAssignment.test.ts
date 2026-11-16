import { describe, expect, it } from "vitest";
import { canAssignTeam, teamValueMatches, PROJECT_TEAM_ROLE } from "../teamAssignment";

describe("team assignment permission", () => {
  it("does not give ordinary members staff-assignment controls", () => {
    expect(canAssignTeam({ manageStaff: false, manageRoles: false }, () => false)).toBe(false);
  });
  it.each(["create", "edit"])("permits HR %s staff grants", action => {
    expect(canAssignTeam({ manageStaff: false, manageRoles: false }, (module, requested, resource) =>
      module === "hr" && requested === action && resource === "staff")).toBe(true);
  });
  it("permits role managers", () => {
    expect(canAssignTeam({ manageStaff: false, manageRoles: true }, () => false)).toBe(true);
  });
  it("normalizes project role comparisons", () => {
    expect(teamValueMatches("LEAD", PROJECT_TEAM_ROLE.LEAD)).toBe(true);
    expect(teamValueMatches("team_member", PROJECT_TEAM_ROLE.LEAD)).toBe(false);
  });
});