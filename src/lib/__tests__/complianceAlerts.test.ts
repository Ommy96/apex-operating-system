import { describe, expect, it } from 'vitest';
import { COMPLIANCE_LEVEL, getComplianceAlerts, visibleComplianceAlerts } from '../complianceAlerts';

const now = new Date(2026, 10, 14, 12);
describe('statutory compliance alerts', () => {
  it('marks an expired certificate red', () => {
    expect(getComplianceAlerts({ kra_exemption_expiry: '2026-11-13' }, now)[0]?.level).toBe(COMPLIANCE_LEVEL.RED);
  });
  it('marks less than 14 days red and exactly 14 days amber', () => {
    expect(getComplianceAlerts({ kra_exemption_expiry: '2026-11-27', ngo_board_cert_expiry: '2026-11-28' }, now).map(a => a.level))
      .toEqual([COMPLIANCE_LEVEL.RED, COMPLIANCE_LEVEL.AMBER]);
  });
  it('includes 59 days but excludes 60 days', () => {
    expect(getComplianceAlerts({ kra_exemption_expiry: '2027-01-12', ngo_board_cert_expiry: '2027-01-13' }, now).map(a => a.id)).toEqual(['kra']);
  });
  it('never exposes certificate alerts without settings permission', () => {
    expect(visibleComplianceAlerts({ kra_exemption_expiry: '2026-11-13' }, false, now)).toEqual([]);
  });
  it('does not invent alerts for missing or invalid expiry dates', () => {
    expect(getComplianceAlerts({ kra_exemption_expiry: null, ngo_board_cert_expiry: 'invalid' }, now)).toEqual([]);
  });
});