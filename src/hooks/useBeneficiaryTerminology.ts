import { useOrgBeneficiaryConfig } from './useOrgBeneficiaryConfig';

/**
 * Provides org-configured terminology for the people the org serves.
 * Defaults to "Beneficiary" / "Beneficiaries".
 *
 * Use anywhere user-facing strings reference beneficiaries.
 */
export function useBeneficiaryTerminology() {
  const { config } = useOrgBeneficiaryConfig();
  const term = config?.beneficiary_terminology?.trim() || 'Beneficiary';
  const stored = config?.beneficiary_terminology_plural?.trim();

  // Auto-pluralise when no explicit plural form is set
  const autoPlural = (() => {
    if (/y$/i.test(term) && !/[aeiou]y$/i.test(term)) {
      return term.replace(/y$/i, 'ies');
    }
    if (/(s|x|z|ch|sh)$/i.test(term)) return term + 'es';
    return term + 's';
  })();

  const termPlural = stored && stored.length > 0 ? stored : autoPlural;

  return {
    term,
    termPlural,
    termLower: term.toLowerCase(),
    termPluralLower: termPlural.toLowerCase(),
    addLabel: `Add ${term}`,
    listTitle: termPlural,
  };
}
