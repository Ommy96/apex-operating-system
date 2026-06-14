import type { QueryClient } from '@tanstack/react-query';

/**
 * Centralised cache invalidation for intelligence views.
 * Call this after a save that could move risk/funding/programme signals:
 * enrollments, guardians, programmes, services, academic records,
 * observations, visits, donations.
 *
 * Saving low-signal fields (e.g. phone, religion) does NOT need this.
 */
export function invalidateIntelligence(
  queryClient: QueryClient,
  beneficiaryId?: string | null,
) {
  const keys: Array<readonly unknown[]> = [
    ['beneficiary-risk'],
    ['org-risk-summary'],
    ['risk-assessment'],
    ['analytics-tabs'],
    ['smart-insights'],
    ['ai-insights'],
    ['funding-intelligence'],
    ['programme-cards-enrollments'],
    ['programme-cards-donors'],
    ['beneficiary-services'],
    ['beneficiary-enrollments'],
    ['beneficiary-donors'],
    ['programme-intelligence'],
  ];
  keys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
  if (beneficiaryId) {
    queryClient.invalidateQueries({ queryKey: ['beneficiary-risk', beneficiaryId] });
  }
}