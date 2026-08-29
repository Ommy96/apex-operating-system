import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PRODUCT_NAME } from '@/config/brand';

type State = 'working' | 'confirmed' | 'error';

/**
 * Landing route for every emailed auth link (signup confirmation, email change,
 * magic link, invite). Supabase sends either `?token_hash=&type=` or `?code=`;
 * without a route that actually redeems those parameters the confirmation never
 * completes and `email_confirmed_at` stays NULL.
 */
export default function AuthConfirm() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const tokenHash = params.get('token_hash') ?? params.get('token');
      const type = (params.get('type') ?? 'signup') as any;
      const code = params.get('code');
      const errorDescription = params.get('error_description');

      try {
        if (errorDescription) throw new Error(errorDescription);

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (window.location.hash.includes('access_token')) {
          // Implicit-flow links put the tokens in the URL fragment; the client
          // library picks these up automatically, so just confirm the session.
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) throw error ?? new Error('Confirmation link is incomplete.');
        } else {
          throw new Error('This confirmation link is missing its token. Request a new email.');
        }

        // Confirmation succeeded. Sign the visitor back out so they land on a
        // clean "email confirmed — sign in" screen rather than a half-state.
        await supabase.auth.signOut();
        if (!cancelled) setState('confirmed');
      } catch (err: any) {
        logger.error('Email confirmation failed', err);
        if (cancelled) return;
        const raw = (err?.message || '').toLowerCase();
        setMessage(
          raw.includes('expired') || raw.includes('invalid')
            ? 'That confirmation link has expired or was already used. Sign in and request a new one.'
            : err?.message || 'We could not confirm your email.'
        );
        setState('error');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        {state === 'working' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Confirming your email…</h1>
            <p className="mt-2 text-sm text-muted-foreground">This only takes a moment.</p>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Email confirmed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your address is verified. Sign in to open your {PRODUCT_NAME} workspace.
            </p>
            <Link
              to="/auth"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Confirmation failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Link
              to="/auth"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
