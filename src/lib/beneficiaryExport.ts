import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface ExportFilters {
  organizationId: string;
  beneficiaryIds?: string[];
}

export async function exportBeneficiariesToExcel(filters: ExportFilters) {
  const { organizationId, beneficiaryIds } = filters;

  let beneficiariesQuery = supabase
    .from('beneficiaries')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (beneficiaryIds?.length) {
    beneficiariesQuery = beneficiariesQuery.in('id', beneficiaryIds);
  }

  const { data: beneficiaries, error } = await beneficiariesQuery;
  if (error) throw error;
  if (!beneficiaries || beneficiaries.length === 0) {
    throw new Error('No beneficiaries to export');
  }

  const ids = beneficiaries.map((b: any) => b.id);

  const [guardiansRes, oosRes, servicesRes] = await Promise.all([
    supabase
      .from('beneficiary_guardians')
      .select('beneficiary_id, relationship, guardians(full_name, guardian_type, phone, email, is_alive)')
      .in('beneficiary_id', ids),
    supabase
      .from('beneficiary_out_of_system_contacts' as any)
      .select('*')
      .in('beneficiary_id', ids),
    supabase
      .from('beneficiary_services')
      .select('beneficiary_id, status, enrolled_date, exit_date, program:programs(name), project:projects(name)')
      .in('beneficiary_id', ids),
  ]);

  const beneficiariesSheet = beneficiaries.map((b: any) => ({
    'Unique ID': b.unique_id || b.id,
    'Full Name': b.display_name,
    'Type': b.beneficiary_type,
    'Category': b.beneficiary_category,
    'Status': b.status,
    'Gender': b.gender,
    'Date of Birth': b.date_of_birth,
    'Country': b.country,
    'County': b.county,
    'Sub-County': b.sub_county,
    'Village': b.estate_village,
    'Primary Need': b.primary_need,
    'Vulnerability Level': b.vulnerability_level,
    'Vulnerability Tags': (b.vulnerability_tags || []).join('; '),
    'Registration Source': b.registration_source,
    'Consent Given': b.consent_given ? 'Yes' : 'No',
    'Consent Date': b.consent_date,
    'Marital Status': b.marital_status,
    'Occupation': b.occupation,
    'Income Level': b.income_level,
    'Source of Income': b.source_of_income,
    'Household Size': b.household_size,
    'Disability Status': b.disability_status,
    'Academic Level': b.academic_level,
    'Grade': b.grade,
    'Institution': b.institution_name,
    'Registered At': b.created_at,
  }));

  const guardiansMap = new Map(beneficiaries.map((b: any) => [b.id, b.display_name]));
  const contactsSheet: any[] = [];
  (guardiansRes.data || []).forEach((g: any) => {
    contactsSheet.push({
      'Beneficiary': guardiansMap.get(g.beneficiary_id) || g.beneficiary_id,
      'Source': 'In-system guardian',
      'Name': g.guardians?.full_name,
      'Relationship': g.relationship,
      'Type': g.guardians?.guardian_type,
      'Phone': g.guardians?.phone,
      'Email': g.guardians?.email,
      'Alive': g.guardians?.is_alive === false ? 'No' : 'Yes',
      'Notes': '',
    });
  });
  (oosRes.data || []).forEach((c: any) => {
    contactsSheet.push({
      'Beneficiary': guardiansMap.get(c.beneficiary_id) || c.beneficiary_id,
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
    'Beneficiary': guardiansMap.get(s.beneficiary_id) || s.beneficiary_id,
    'Programme': s.program?.name,
    'Project': s.project?.name,
    'Status': s.status,
    'Enrolled': s.enrolled_date,
    'Exited': s.exit_date,
  }));

  const summarySheet = [
    { Metric: 'Total beneficiaries', Value: beneficiaries.length },
    { Metric: 'Active', Value: beneficiaries.filter((b: any) => b.status === 'active').length },
    { Metric: 'Inactive', Value: beneficiaries.filter((b: any) => b.status !== 'active').length },
    { Metric: 'With consent', Value: beneficiaries.filter((b: any) => b.consent_given).length },
    { Metric: 'In-system contacts', Value: (guardiansRes.data || []).length },
    { Metric: 'Out-of-system contacts', Value: (oosRes.data || []).length },
    { Metric: 'Total enrollments', Value: (servicesRes.data || []).length },
    { Metric: 'Generated at', Value: new Date().toISOString() },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(beneficiariesSheet), 'Beneficiaries');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contactsSheet), 'Contacts');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(enrollmentsSheet), 'Enrollments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Summary');

  XLSX.writeFile(wb, `beneficiaries-${new Date().toISOString().slice(0, 10)}.xlsx`);
  return beneficiaries.length;
}