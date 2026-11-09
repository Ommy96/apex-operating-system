import { describe, it, expect } from 'vitest';
import { gradeChangeSince, needStatusLabel, yearsSince } from '../donorProfile';

describe('donor profile milestone', () => {
  it('counts whole years since sponsorship start', () => {
    expect(yearsSince('2023-03-01', new Date('2026-02-28'))).toBe(2);
    expect(yearsSince(null)).toBeNull();
  });
  it('shows a grade change only from recorded progression', () => {
    const prog = [{ progression_date: '2024-01-10', previous_grade: 'Grade 5' }];
    expect(gradeChangeSince('2023-06-01', 'Grade 7', prog)).toEqual({ from: 'Grade 5', to: 'Grade 7' });
    expect(gradeChangeSince('2023-06-01', 'Grade 7', [])).toBeNull();
    expect(gradeChangeSince('2023-06-01', null, prog)).toBeNull();
  });
  it('labels need status case-insensitively', () => {
    expect(needStatusLabel('MET').tone).toBe('met');
    expect(needStatusLabel('unmet').tone).toBe('unmet');
    expect(needStatusLabel(undefined).tone).toBe('unknown');
  });
});
