import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { exportBeneficiariesToExcel } from '../beneficiaryExport';

const state = vi.hoisted(() => ({ configError: null as null | Error, customFields: [] as { name: string; label: string; type: string }[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const result = table === 'beneficiaries' ? { data: [{
      id: 'person-1', beneficiary_code: 'TEST-1', display_name: 'Test Person', consent_given: true,
      institution_name: 'Existing Primary School', grade: 'Grade 7', academic_level: 'primary',
      sector_data: { facility_code: 'FAC-12' },
    }], error: null } : table === 'org_beneficiary_config' ? { data: { custom_fields: state.customFields }, error: state.configError }
      : table === 'organizations' ? { data: { name: 'Test organisation' }, error: null }
      : { data: [], error: null };
    const chain: Record<string, unknown> = { then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    for (const method of ['select', 'eq', 'is', 'in', 'order', 'range', 'maybeSingle']) chain[method] = () => chain;
    return chain;
  },
} }));
vi.mock('xlsx', async importOriginal => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return { ...actual, writeFile: vi.fn() };
});

describe('beneficiary export after sector cleanup', () => {
  beforeEach(() => { vi.clearAllMocks(); state.configError = null; state.customFields = []; });
  it('exports core education columns without a duplicate sector sheet', async () => {
    expect(await exportBeneficiariesToExcel({ organizationId: 'test-org', beneficiaryIds: ['person-1'] })).toBe(1);
    const workbook = vi.mocked(XLSX.writeFile).mock.calls[0]?.[0];
    expect(workbook).toBeDefined();
    if (!workbook) throw new Error('Export did not produce a workbook');
    expect(workbook.SheetNames).not.toContain('Sector Details');
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Beneficiaries);
    expect(rows[0]).toMatchObject({ 'Institution name': 'Existing Primary School', 'Class / grade / year': 'Grade 7', 'Academic level': 'primary' });
  });
  it('continues exporting genuine configured custom fields', async () => {
    state.customFields = [{ name: 'facility_code', label: 'Facility code', type: 'text' }];
    await exportBeneficiariesToExcel({ organizationId: 'test-org', beneficiaryIds: ['person-1'] });
    const workbook = vi.mocked(XLSX.writeFile).mock.calls[0]?.[0];
    if (!workbook) throw new Error('Export did not produce a workbook');
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Sector Details'])[0]).toMatchObject({ 'Facility code': 'FAC-12' });
  });
  it('does not download incomplete exports when config cannot be read', async () => {
    state.configError = new Error('Configuration access denied');
    await expect(exportBeneficiariesToExcel({ organizationId: 'test-org', beneficiaryIds: ['person-1'] })).rejects.toThrow('Configuration access denied');
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });
});