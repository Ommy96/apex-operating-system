import { useFormContext, Controller } from 'react-hook-form';
import { GuardianFields, EMPTY_GUARDIAN, type GuardianFieldsValue } from './GuardianFields';

interface GuardianFormProps {
  guardianType: 'father' | 'mother' | 'caregiver';
  prefix: string;
}

/**
 * Thin react-hook-form adapter around the shared GuardianFields component.
 * Kept so existing react-hook-form callers continue to work, while the
 * presentational layout lives in a single source of truth.
 */
export function GuardianForm({ guardianType, prefix }: GuardianFormProps) {
  const { control } = useFormContext();
  const title =
    guardianType === 'father'
      ? 'Father'
      : guardianType === 'mother'
      ? 'Mother'
      : 'Caregiver / contact';
  const lockRelationship = guardianType !== 'caregiver';
  const defaultRelationship =
    guardianType === 'father' ? 'Father' : guardianType === 'mother' ? 'Mother' : '';

  return (
    <Controller
      control={control}
      name={prefix}
      defaultValue={{ ...EMPTY_GUARDIAN, relationship: defaultRelationship } as GuardianFieldsValue}
      render={({ field }) => {
        const value: GuardianFieldsValue = {
          ...EMPTY_GUARDIAN,
          relationship: defaultRelationship,
          ...(field.value || {}),
        };
        return (
          <GuardianFields
            title={title}
            value={value}
            onChange={field.onChange}
            lockRelationship={lockRelationship}
            requireName
          />
        );
      }}
    />
  );
}
