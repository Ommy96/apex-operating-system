import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { SectorField } from '@/hooks/useOrgBeneficiaryConfig';

export interface ExportFilters {
  organizationId: string;
  beneficiaryIds?: string[];
}

/** Age in whole years, or null when the date of birth is missing/unparseable. */
function ageFrom(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Consent + minor-visibility rules, applied to EVERY exported sheet.
 *
 * - No consent on file  -> surname is reduced to an initial.
 * - Under 18 without consent -> exact date of birth is replaced by an age
 *   band, and the village (the most precise locator we hold) is withheld.
 *
 * The beneficiary code is always safe to export: it is the identifier the
 * org is meant to use in documents.
 */
function applyPrivacy(b: any) {
  const consented = !!b.consent_given;
  const age = ageFrom(b.date_of_birth);
  const isMinor = age != null && age < 18;
  const restrictDetail = isMinor && !consented;

  const name: string = b.display_name || [b.first_name, b.last_name].filter(Boolean).join(' ') || '';
  let safeName = name;
  if (!consented && name.includes(' ')) {
    const parts = name.trim().split(/\s+/);
    const surname = parts.pop() as string;
    safeName = `${parts.join(' ')} ${surname.charAt(0).toUpperCase()}.`;
  }

  const ageBand =
    age == null ? '' : age < 5 ? '0-4' : age < 10 ? '5-9' : age < 14 ? '10-13' : age < 18 ? '14-17' : age < 25 ? '18-24' : age < 35 ? '25-34' : age < 50 ? '35-49' : '50+';

  return {
    safeName,
    age,
    ageBand,
    dateOfBirth: restrictDetail ? '' : (b.date_of_birth || ''),
    village: restrictDetail ? '[withheld]' : (b.estate_village || b.village || ''),
    redacted: !consented,
  };
}

export async function exportBeneficiariesToExcel(filters: ExportFilters) {
  const CHUNK = 100;
  function chunked(arr: string[]): string[][] {
    const out: string[][] = [];
    for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
    return out;
  }
  async function fetchIn(table: string, select: string, column: string, values: string[]) {
    const rows: any[] = [];
    for (const chunk of chunked(values)) {
      const { data, error } = await supabase.from(table as any).select(select).in(column, chunk);
      if (error) throw error;
      rows.push(...((data as any[]) || []));
    }
    return { data: rows };
  }

  const { organizationId, beneficiaryIds } = filters;

  // Fetch in pages: PostgREST caps at 1000 rows per request, and long `in()`
  // lists blow past the URL length limit (which surfaces as "Bad request").
  const beneficiaries: any[] = [];
  if (beneficiaryIds?.length) {
    for (const chunk of chunked(beneficiaryIds)) {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .in('id', chunk);
      if (error) throw error;
      beneficiaries.push(...(data || []));
    }
  } else {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      beneficiaries.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
  }
  if (!beneficiaries || beneficiaries.length === 0) {
    throw new Error('No beneficiaries to export');
  }

  const ids = beneficiaries.map((b: any) => b.id);

  const [bgRes, oosRes, servicesRes, programsRes, projectsRes, configRes, orgRes, needsRes] =
    await Promise.all([
      fetchIn('beneficiary_guardians', 'beneficiary_id, relationship, guardian_id', 'beneficiary_id', ids),
      fetchIn('beneficiary_out_of_system_contacts', '*', 'beneficiary_id', ids),
      fetchIn(
        'beneficiary_services',
        'beneficiary_id, status, enrolled_date, exit_date, program_id, project_id, project_name',
        'beneficiary_id',
        ids,
      ),
      supabase.from('programs').select('id, name').eq('organization_id', organizationId),
      supabase.from('projects').select('id, name').eq('organization_id', organizationId),
      supabase
        .from('org_beneficiary_config' as any)
        .select('org_type, custom_fields, beneficiary_terminology_plural, beneficiary_terminology')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase.from('organizations').select('name').eq('id', organizationId).maybeSingle(),
      fetchIn(
        'beneficiary_needs',
        'beneficiary_id, status, estimated_cost, funded_amount, currency, priority, need_type:need_types(label)',
        'beneficiary_id',
        ids,
      ),
    ]);

  const guardianIds = Array.from(new Set((bgRes.data || []).map((g: any) => g.guardian_id).filter(Boolean)));
  const guardiansRes = guardianIds.length
    ? await fetchIn('guardians', 'id, full_name, guardian_type, phone, email, is_alive', 'id', guardianIds)
    : { data: [] as any[] };
  const guardianById = new Map((guardiansRes.data || []).map((g: any) => [g.id, g]));
  const programById = new Map((programsRes.data || []).map((p: any) => [p.id, p.name]));
  const projectById = new Map((projectsRes.data || []).map((p: any) => [p.id, p.name]));

  const config: any = configRes.data || {};
  const sectorFields: SectorField[] = Array.isArray(config.custom_fields) ? config.custom_fields : [];
  const orgName = (orgRes.data as any)?.name || 'Organisation';

  const privacyById = new Map(beneficiaries.map((b: any) => [b.id, applyPrivacy(b)]));
  const nameById = new Map(beneficiaries.map((b: any) => [b.id, privacyById.get(b.id)!.safeName]));
  const codeById = new Map(
    beneficiaries.map((b: any) => [b.id, b.beneficiary_code || b.unique_id || '']),
  );

  // ---- Core sheet: universal columns only -------------------------------
  const beneficiariesSheet = beneficiaries.map((b: any) => {
    const p = privacyById.get(b.id)!;
    return {
      'Code': codeById.get(b.id),
      'Name': p.safeName,
      'Type': b.beneficiary_type,
      'Category': b.beneficiary_category,
      'Status': b.status,
      'Gender': b.gender,
      'Date of Birth': p.dateOfBirth,
      'Age': p.age ?? '',
      'Age Band': p.ageBand,
      'Country': b.country || '',
      'County / Region': b.county || b.region || '',
      'Sub-County / District': b.sub_county || b.district || '',
      'Ward': b.ward || '',
      'Village / Estate': p.village,
      'Phone': b.phone || b.contact_phone || '',
      'Primary Need': b.primary_need,
      'Vulnerability Level': b.vulnerability_level,
      'Vulnerability Tags': (b.vulnerability_tags || []).join('; '),
      'Registration Source': b.registration_source,
      'Consent Given': b.consent_given ? 'Yes' : 'No',
      'Consent Date': b.consent_date || '',
      'Privacy Applied': p.redacted ? 'Surname redacted (no consent)' : '',
      'Registered At': b.created_at,
    };
  });

  // ---- Sector sheet: only the fields this org actually collects ---------
  const sectorSheet = sectorFields.length
    ? beneficiaries.map((b: any) => {
        const row: Record<string, any> = {
          'Code': codeById.get(b.id),
          'Name': privacyById.get(b.id)!.safeName,
        };
        const data = (b.sector_data && typeof b.sector_data === 'object') ? b.sector_data : {};
        for (const f of sectorFields) {
          const v = (data as any)[f.name];
          row[f.group ? `${f.group} — ${f.label}` : f.label] =
            v == null ? '' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join('; ') : v;
        }
        return row;
      })
    : [];

  const contactsSheet: any[] = [];
  (bgRes.data || []).forEach((g: any) => {
    const gu: any = guardianById.get(g.guardian_id) || {};
    contactsSheet.push({
      'Beneficiary Code': codeById.get(g.beneficiary_id) || '',
      'Beneficiary': nameById.get(g.beneficiary_id) || '',
      'Source': 'In-system guardian',
      'Name': gu.full_name,
      'Relationship': g.relationship,
      'Type': gu.guardian_type,
      'Phone': gu.phone,
      'Email': gu.email,
      'Alive': gu.is_alive === false ? 'No' : 'Yes',
      'Notes': '',
    });
  });
  (oosRes.data || []).forEach((c: any) => {
    contactsSheet.push({
      'Beneficiary Code': codeById.get(c.beneficiary_id) || '',
      'Beneficiary': nameById.get(c.beneficiary_id) || '',
      'Source': 'Out-of-system',
      'Name': c.full_name,
      'Relationship': c.relationship_type,
      'Type': '',
      'Phone': c.phone,
      'Email': '',
      'Alive': '',
      'Notes': c.notes,
    });
  });

  const enrollmentsSheet = (servicesRes.data || []).map((s: any) => ({
    'Beneficiary Code': codeById.get(s.beneficiary_id) || '',
    'Beneficiary': nameById.get(s.beneficiary_id) || '',
    'Programme': programById.get(s.program_id) || '',
    'Project': projectById.get(s.project_id) || s.project_name || '',
    'Status': s.status,
    'Enrolled': s.enrolled_date,
    'Exited': s.exit_date,
  }));

  const needsSheet = (needsRes.data || []).map((n: any) => ({
    'Beneficiary Code': codeById.get(n.beneficiary_id) || '',
    'Beneficiary': nameById.get(n.beneficiary_id) || '',
    'Need': n.need_type?.label || '',
    'Status': n.status,
    'Priority': n.priority,
    'Estimated Cost': n.estimated_cost ?? '',
    'Funded': n.funded_amount ?? 0,
    'Gap': n.estimated_cost != null ? Number(n.estimated_cost) - Number(n.funded_amount || 0) : '',
    'Currency': n.currency || '',
  }));

  const redactedCount = beneficiaries.filter((b: any) => privacyById.get(b.id)!.redacted).length;
  const summarySheet = [
    { Metric: 'Organisation', Value: orgName },
    { Metric: 'Sector', Value: config.org_type || 'general' },
    { Metric: 'Total records', Value: beneficiaries.length },
    { Metric: 'Active', Value: beneficiaries.filter((b: any) => (b.status || '').toLowerCase() === 'active').length },
    { Metric: 'Inactive', Value: beneficiaries.filter((b: any) => (b.status || '').toLowerCase() !== 'active').length },
    { Metric: 'With consent', Value: beneficiaries.filter((b: any) => b.consent_given).length },
    { Metric: 'Surnames redacted (no consent)', Value: redactedCount },
    { Metric: 'Sector fields exported', Value: sectorFields.length },
    { Metric: 'In-system contacts', Value: (bgRes.data || []).length },
    { Metric: 'Out-of-system contacts', Value: (oosRes.data || []).length },
    { Metric: 'Total enrollments', Value: (servicesRes.data || []).length },
    { Metric: 'Needs recorded', Value: (needsRes.data || []).length },
    { Metric: 'Generated at', Value: new Date().toISOString() },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(beneficiariesSheet), 'Beneficiaries');
  if (sectorSheet.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sectorSheet), 'Sector Details');
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contactsSheet), 'Contacts');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(enrollmentsSheet), 'Enrollments');
  if (needsSheet.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(needsSheet), 'Needs');
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Summary');

  XLSX.writeFile(wb, `beneficiaries-${new Date().toISOString().slice(0, 10)}.xlsx`);
  return beneficiaries.length;
}
