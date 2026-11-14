import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import { deliver, isSent } from '../_shared/delivery.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) return reply({ error: 'Reminder delivery is not configured. Nothing was sent.' });
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Sign in to send reminders' });
    const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return reply({ error: 'Sign in to send reminders' });
    const { obligation_id, period_start } = await req.json();
    const { data: nudge, error } = await caller.rpc('prepare_reporting_nudge', { _obligation: obligation_id, _period: period_start });
    if (error) return reply({ error: error.message });
    if (!nudge?.contact) return reply({ error: 'Staff member has no email address. Reminder task was recorded, but no email was sent.' });
    const admin = createClient(url, service);
    const text = `Please submit ${nudge.form_name} for ${nudge.scope_name}, reporting period ${nudge.period_start} to ${nudge.period_end}. Open your secure staff workspace to submit your report.`;
    const result = await deliver(admin, {
      organizationId: nudge.organization_id, channel: 'email', source: 'reporting-nudge',
      idempotencyKey: nudge.idempotency_key, recipientUserId: nudge.recipient_user_id,
      to: nudge.contact, subject: 'Reporting submission reminder', text,
      linkPath: '/workspace', createdBy: auth.user.id,
    });
    return reply({ sent: isSent(result.status) && !result.duplicate, duplicate: result.duplicate || false, status: result.status, message: result.error });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : String(error) }); }
});