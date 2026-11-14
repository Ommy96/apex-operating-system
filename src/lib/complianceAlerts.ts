import { differenceInCalendarDays, parseISO } from 'date-fns';

export const COMPLIANCE_LEVEL = { RED: 'red', AMBER: 'amber' } as const;
export const COMPLIANCE_SETTINGS_URL = '/organization-settings?section=compliance';

export interface ComplianceExpiryFields {
  kra_exemption_expiry?: string | null;
  ngo_board_cert_expiry?: string | null;
}

export function getComplianceAlerts(org: ComplianceExpiryFields | null | undefined, now = new Date()) {
  const certificates = [
    { id: 'kra', title: 'KRA Tax Exemption Certificate', expiry: org?.kra_exemption_expiry },
    { id: 'ngo', title: 'NGO Board Certificate', expiry: org?.ngo_board_cert_expiry },
  ];
  return certificates.flatMap(({ id, title, expiry }) => {
    if (!expiry) return [];
    const days = differenceInCalendarDays(parseISO(expiry), now);
    if (!Number.isFinite(days) || days >= 60) return [];
    return [{
      id, title, days,
      level: days < 14 ? COMPLIANCE_LEVEL.RED : COMPLIANCE_LEVEL.AMBER,
      label: days < 0 ? 'Expired' : days < 14 ? 'Urgent' : 'Expiring soon',
      message: days < 0 ? `${title} expired ${Math.abs(days)} days ago.` : `${title} expires in ${days} days.`,
    }];
  });
}

export function visibleComplianceAlerts(org: ComplianceExpiryFields | null | undefined, canManageSettings: boolean, now = new Date()) {
  return canManageSettings ? getComplianceAlerts(org, now) : [];
}