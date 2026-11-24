import { describe, it, expect } from 'vitest';
import { landingPathFor, buildScopeHeadline, hasAnyLink, isReach, DEPARTMENT_DATA_REACH } from '../staffScope';

describe('staff scope', () => {
  it('org-reach users land on the dashboard', () => expect(landingPathFor(true)).toBe('/dashboard'));
  it('scoped users land on the workspace', () => expect(landingPathFor(false)).toBe('/workspace'));
  it('headline states the scope in words', () => {
    expect(buildScopeHeadline({ firstName: 'Sylvester', hour: 19, programmes: ['Family Adoption'], projects: ['Guardian Ration', 'Home Based Care'], departments: ['M&E'] }))
      .toBe('Good evening, Sylvester · Your programmes: Family Adoption · Your projects: Guardian Ration, Home Based Care · Department: M&E');
  });
  it('no links means empty workspace', () => expect(hasAnyLink({ programIds: [], projectIds: [], departmentIds: [] })).toBe(false));
  it('reach comparison is case-insensitive', () => expect(isReach('Organization', DEPARTMENT_DATA_REACH.ORGANIZATION)).toBe(true));
});
