import { describe, it, expect } from 'vitest';
import { resolveViewScope } from '@/lib/dataScope';

describe('resolveViewScope', () => {
  it('no active role sees nothing', () => expect(resolveViewScope([], false)).toBe('none'));
  it('custom assigned role is project-scoped', () => expect(resolveViewScope(['assigned'], false)).toBe('project'));
  it('program manager plus assigned role is the union (programme), not everything', () =>
    expect(resolveViewScope(['program', 'assigned'], false)).toBe('program'));
  it('an organisation role widens to the organisation', () => expect(resolveViewScope(['program', 'organization'], false)).toBe('organization'));
  it('elevated members see the organisation', () => expect(resolveViewScope([], true)).toBe('organization'));
});
