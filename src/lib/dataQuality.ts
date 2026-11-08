import { z } from 'zod';
import { CARE_ARRANGEMENT, normaliseCareArrangement } from './careArrangement';

export const QUALITY_TEMPLATES = [
  { key: 'missing_dob', label: 'Missing date of birth', entity: 'beneficiary' },
  { key: 'minor_without_guardian', label: 'Minor without a guardian', entity: 'beneficiary' },
  { key: 'expired_consent', label: 'Expired consent', entity: 'consent_record' },
  { key: 'care_unset', label: 'Care arrangement not set', entity: 'beneficiary' },
  { key: 'need_without_assessment', label: 'Need without a linked assessment', entity: 'beneficiary_need' },
] as const;
export const qualityTemplateSchema = z.enum(QUALITY_TEMPLATES.map(t => t.key) as ['missing_dob', 'minor_without_guardian', 'expired_consent', 'care_unset', 'need_without_assessment']);
export const qualityConfigSchema = z.object({ project_id: z.string().uuid().optional() }).strict();
export const qualityIssueIdentity = (ruleId: string, recordId: string) => `${ruleId}:${recordId}`;
export const isCareUnset = (value?: string | null) => normaliseCareArrangement(value) === CARE_ARRANGEMENT.UNKNOWN;
export function minorWithoutGuardian(dob: string | null, guardianCount: number, today: Date): boolean {
  if (!dob) return false;
  const born = new Date(`${dob}T00:00:00Z`);
  if (!Number.isFinite(born.getTime()) || born > today) return false;
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  if (today.getUTCMonth() < born.getUTCMonth() || (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate())) age--;
  return age < 18 && guardianCount === 0;
}
export function qualityCorrectionPath(flag: { entity_type: string; entity_id: string; beneficiary_id?: string | null }) {
  const id = flag.entity_type === 'beneficiary' ? flag.entity_id : flag.beneficiary_id;
  if (id) return `/beneficiary/${id}`;
  if (flag.entity_type === 'consent_record') return '/compliance';
  return null;
}