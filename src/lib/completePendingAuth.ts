import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface PendingOrganization {
  name: string;
  slug: string;
  type: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  country?: string;
  county?: string;
  registration_number?: string;
  subscription_tier?: string;
  features_enabled?: Record<string, number | boolean>;
}

// One completion per user/token even if React remounts the confirmation page.
const completing = new Map<string, Promise<void>>();

export function completePendingAuth(user: User, token?: string | null, slug?: string): Promise<void> {
  const invite = token || user.user_metadata.pending_invitation_token;
  const key = `${user.id}:${invite || ''}:${slug || ''}`;
  const existing = completing.get(key);
  if (existing) return existing;
  const promise = complete(user, invite, slug).finally(() => completing.delete(key));
  completing.set(key, promise);
  return promise;
}

async function complete(user: User, invite?: string, slug?: string) {
  const pending = user.user_metadata.pending_organization as PendingOrganization | undefined;
  if (pending) {
    if (!pending.name || !pending.slug || !pending.type) throw new Error('Organisation details are incomplete.');
    const { error } = await supabase.rpc('register_organization', {
      _org_name: pending.name,
      _org_slug: slug || pending.slug,
      _org_type: pending.type,
      _description: pending.description || null,
      _email: pending.email || null,
      _phone: pending.phone || null,
      _website: pending.website || null,
      _address: pending.address || null,
      _country: pending.country || null,
      _county: pending.county || null,
      _registration_number: pending.registration_number || null,
      _subscription_tier: pending.subscription_tier || 'free',
      _features_enabled: pending.features_enabled || {},
    });
    if (error) throw error;
    const { error: clearError } = await supabase.auth.updateUser({ data: { pending_organization: null } });
    if (clearError) throw new Error(`Organisation created, but could not clear registration details: ${clearError.message}`);
  }
  if (invite) {
    const { error } = await supabase.rpc('accept_invitation', { _token: invite });
    if (error) throw error;
    const { error: clearError } = await supabase.auth.updateUser({ data: { pending_invitation_token: null } });
    if (clearError) throw new Error(`Invitation accepted, but could not clear invitation details: ${clearError.message}`);
  }
}