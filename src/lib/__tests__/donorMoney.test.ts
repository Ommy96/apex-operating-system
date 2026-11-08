import { describe, it, expect } from 'vitest';
import { allocationValue, allocationTotal, receivedContribution, contactBirthdayAllowed, sponsorDocumentAllowed } from '../donorMoney';
const allocation = { amount_base: 12900, base_currency: 'KES', amount_native: 100, native_currency: 'USD', fx_rate: 129, fx_snapshot: { EUR: 0.007 } };
describe('donor financial and privacy rules', () => {
  it('uses the captured native allocation amount for USD', () => expect(allocationValue(allocation, 'USD')).toBe(100));
  it('uses captured snapshot rates for other currencies', () => expect(allocationValue(allocation, 'EUR')).toBeCloseTo(90.3));
  it('never invents missing historical exchange rates', () => expect(allocationValue(allocation, 'GBP')).toBeNull());
  it('excludes cancelled and redirected allocations from totals', () => expect(allocationTotal([{ ...allocation, status: 'cancelled' }, { ...allocation, status: 'redirected' }], 'USD')).toBe('$0.00'));
  it('does not acknowledge a pending payment', () => expect(receivedContribution({ amount: 100, status: 'pending' })).toBe(false));
  it('acknowledges a recorded received payment', () => expect(receivedContribution({ amount: 100, status: 'received' })).toBe(true));
  it('requires DOB for birthday contact', () => expect(contactBirthdayAllowed(null, true, true)).toBe(false));
  it('requires contact consent for birthday contact', () => expect(contactBirthdayAllowed('2010-11-08', false, true)).toBe(false));
  it.each(['consent_form', 'medical_record', 'intake_form'])('never shares %s', type => expect(sponsorDocumentAllowed(type)).toBe(false));
  it('allows an explicitly selected school report type', () => expect(sponsorDocumentAllowed('school_report')).toBe(true));
});