import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomBeneficiaryFields } from './CustomBeneficiaryFields';

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
afterEach(cleanup);

describe('custom field additions', () => {
  it('does not add a duplicate core name even when the label is unrelated', () => {
    const onChange = vi.fn();
    render(<CustomBeneficiaryFields fields={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'current_school' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Other detail' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    expect(onChange).not.toHaveBeenCalled();
  });
  it('does not add a duplicate core label even when the name is unrelated', () => {
    const onChange = vi.fn();
    render(<CustomBeneficiaryFields fields={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'other_detail' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Phone' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    expect(onChange).not.toHaveBeenCalled();
  });
  it('adds one genuine field without altering existing fields', () => {
    const onChange = vi.fn();
    const existing = { name: 'land_acreage', label: 'Land acreage', type: 'number', group: 'Farm' };
    render(<CustomBeneficiaryFields fields={[existing]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'facility_code' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Facility code' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith([existing, { name: 'facility_code', label: 'Facility code', type: 'text' }]);
  });
});