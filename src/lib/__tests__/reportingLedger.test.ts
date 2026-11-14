import { describe, it, expect } from 'vitest';
import { REPORT_STATUS, reportingRollup, type LedgerCell } from '../reportingLedger';
const cell = (id: string, status: string) => ({ obligation_id: id, status }) as LedgerCell;
describe('reporting programme denominator', () => {
  it('counts distinct obligations, not repeated submissions', () => {
    expect(reportingRollup([cell('one', REPORT_STATUS.SUBMITTED), cell('one', REPORT_STATUS.SUBMITTED), cell('one', REPORT_STATUS.SUBMITTED), cell('two', REPORT_STATUS.OVERDUE)]))
      .toEqual({ submitted: 1, total: 2, percentage: 50 });
  });
  it('does not calculate a percentage with zero obligations', () => {
    expect(reportingRollup([])).toEqual({ submitted: 0, total: 0, percentage: null });
  });
});