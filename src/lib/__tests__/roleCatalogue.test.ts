import { describe, expect, it } from 'vitest';
import { organisationRoleCatalogue } from '../roleCatalogue';

const role = (id: string, organization_id: string | null, name = 'field_officer', is_system_role = true) => ({
  id, organization_id, name, is_system_role, display_name: name, created_at: id,
});
describe('organisation role catalogue', () => {
  it('excludes other organisations, including for a super-admin-visible catalogue', () => {
    const roles = [role('1', 'h2ho'), role('2', 'umazi')];
    expect(organisationRoleCatalogue(roles, 'h2ho', []).map(r => r.id)).toEqual(['1']);
    expect(organisationRoleCatalogue(roles, 'umazi', []).map(r => r.id)).toEqual(['2']);
  });
  it('prefers local roles over global templates but retains global-only system roles', () => {
    expect(organisationRoleCatalogue([role('1', null), role('2', 'h2ho'), role('3', null, 'viewer')], 'h2ho', []).map(r => r.id)).toEqual(['2', '3']);
  });
  it('collapses identical system grants without changing or unioning distinct permission sets', () => {
    const roles = [role('1', 'h2ho'), role('2', 'h2ho'), role('3', 'h2ho')];
    const grants = [{ role_id: '1', permission_id: 'read' }, { role_id: '2', permission_id: 'read' }, { role_id: '3', permission_id: 'edit' }];
    expect(organisationRoleCatalogue(roles, 'h2ho', grants).map(r => r.id)).toEqual(['1', '3']);
    expect(roles).toHaveLength(3);
  });
  it('preserves custom roles even with identical permission sets', () => {
    expect(organisationRoleCatalogue([role('1', 'h2ho', 'custom', false), role('2', 'h2ho', 'custom', false)], 'h2ho', [])).toHaveLength(2);
  });
});