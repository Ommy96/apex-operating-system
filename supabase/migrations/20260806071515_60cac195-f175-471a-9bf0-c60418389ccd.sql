ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS delivery_error text,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_attempts integer NOT NULL DEFAULT 0;

UPDATE public.organization_invitations
SET delivery_status = 'failed',
    delivery_error = 'Email was never delivered: sender domain was not verified. Please resend.'
WHERE status = 'pending' AND delivery_status = 'sent' AND last_sent_at IS NULL;

NOTIFY pgrst, 'reload schema';