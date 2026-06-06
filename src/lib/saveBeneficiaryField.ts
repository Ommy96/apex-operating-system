import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SaveArgs {
  beneficiaryId: string;
  organizationId: string;
  field: string;
  label: string;
  newValue: any;
  oldValue: any;
  userId?: string | null;
  /** Optimistically updates local state; called with the value to set. */
  applyLocal: (value: any) => void;
}

async function writeField(beneficiaryId: string, organizationId: string, field: string, value: any) {
  const { error } = await supabase
    .from('beneficiaries')
    .update({ [field]: value } as any)
    .eq('id', beneficiaryId)
    .eq('organization_id', organizationId);
  if (error) throw error;
}

async function writeAudit(args: {
  beneficiaryId: string;
  organizationId: string;
  field: string;
  oldValue: any;
  newValue: any;
  userId?: string | null;
  reverted?: boolean;
}) {
  try {
    await supabase.from('audit_logs').insert({
      event_type: args.reverted ? 'beneficiary_field_reverted' : 'beneficiary_field_updated',
      entity_type: 'beneficiary',
      entity_id: args.beneficiaryId,
      user_id: args.userId ?? null,
      old_values: { [args.field]: args.oldValue ?? null } as any,
      new_values: { [args.field]: args.newValue ?? null } as any,
      metadata: { field: args.field, source: 'inline_edit', organization_id: args.organizationId } as any,
    } as any);
  } catch (e) {
    logger.warn('audit log insert failed', e);
  }
}

export async function saveBeneficiaryField(args: SaveArgs): Promise<void> {
  const { beneficiaryId, organizationId, field, label, newValue, oldValue, userId, applyLocal } = args;

  // Optimistic update
  applyLocal(newValue);

  try {
    await writeField(beneficiaryId, organizationId, field, newValue);
    await writeAudit({ beneficiaryId, organizationId, field, oldValue, newValue, userId });

    toast.success(`${label} updated`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            applyLocal(oldValue);
            await writeField(beneficiaryId, organizationId, field, oldValue);
            await writeAudit({ beneficiaryId, organizationId, field, oldValue: newValue, newValue: oldValue, userId, reverted: true });
            toast(`${label} reverted`);
          } catch (err) {
            logger.error('Undo failed', err);
            applyLocal(newValue);
            toast.error('Could not undo change');
          }
        },
      },
    });
  } catch (err: any) {
    // Rollback optimistic update
    applyLocal(oldValue);
    logger.error('Inline save failed', err);
    toast.error(`Failed to update ${label}`, { description: err?.message });
    throw err;
  }
}