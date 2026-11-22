import { describe, expect, it } from 'vitest';
import { coreFieldStep, customFieldWarnings } from '../beneficiaryCustomFields';
import { SECTOR_PRESETS } from '../setupWizardSectors';

describe('custom beneficiary fields', () => {
  it('does not seed the five duplicate education/sponsorship fields', () => {
    const fields = SECTOR_PRESETS.find(preset => preset.key === 'education')?.customFields;
    expect(fields).toEqual([]);
  });
  it('retains all four education indicators', () => {
    expect(SECTOR_PRESETS.find(preset => preset.key === 'education')?.indicators.map(item => item.name)).toEqual([
      'Number of learners sponsored', 'Average attendance rate', 'Transition rate to next class', 'Average exam score',
    ]);
  });
  it.each([
    ['current_school', 'Unrelated label', 'Education'],
    ['currentGrade', 'Unrelated label', 'Education'],
    ['custom', 'Class / grade / year', 'Education'],
    ['attendance_rate', 'School attendance %', 'School visits'],
    ['custom', 'Sponsorship status', 'Sponsorship'],
    ['date_of_birth', 'Unrelated label', 'Demographics'],
    ['custom', 'GENDER', 'Demographics'],
    ['contactPhone', 'Unrelated label', 'Identity'],
  ])('detects core field %s / %s', (name, label, step) => {
    expect(coreFieldStep({ name, label })).toBe(step);
  });
  it('allows a genuine facility code and keeps agriculture presets', () => {
    expect(customFieldWarnings([{ name: 'facility_code', label: 'Facility code', type: 'text' }])).toEqual([]);
    expect(SECTOR_PRESETS.find(preset => preset.key === 'agriculture')?.customFields.map(field => field.name)).toEqual([
      'land_acreage', 'primary_crops', 'livestock_count', 'last_harvest_yield_kg', 'market_access',
    ]);
  });
});