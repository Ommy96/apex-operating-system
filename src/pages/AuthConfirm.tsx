import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { completePendingAuth } from '@/lib/completePendingAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type State = 'working' | 'confirmed' | 'error' | 'slug';

export default function AuthConfirm() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>('working');
  const [message, setMessage] = useState('');
  const [slug, setSlug] = useState('');
  const verified = useRef<Promise<User> | null>(null);
  const sessionUser = useRef<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      const tokenHash = params.get('token_hash') ?? params.get('token');
      const type = (params.get('type') ?? 'signup') as 'signup';
      const code = params.get('code');
      const errorDescription = params.get('error_description');
      if (errorDescription) throw new Error(errorDescription);
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) throw error;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) throw new Error('This confirmation link is incomplete or expired. Please sign in or request a new email.');
      return data.session.user;
    };
    // Reuse redemption across StrictMode effects: a one-use email token must not be redeemed twice.
    if (!verified.current) verified.current = verify();
    verified.current.then(async user => {
      sessionUser.current = user;
      setSlug(user.user_metadata.pending_organization?.slug || '');
      await completePendingAuth(user, params.get('invite'));
      if (!cancelled) setState('confirmed');
    }).catch(error => {
      if (cancelled) return;
      const text = (error as Error).message || 'We could not complete your account.';
      setMessage(text);
      toast.error(text);
      setState(text.includes('slug_taken') ? 'slug' : 'error');
    });
    return () => { cancelled = true; };
  }, [params]);

  const chooseSlug = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionUser.current || !/^[a-z0-9-]{3,}$/.test(slug)) return;
    setState('working');
    try {
      await completePendingAuth(sessionUser.current, params.get('invite'), slug);
      setState('confirmed');
    } catch (error) {
      const text = (error as Error).message;
      setMessage(text);
      toast.error(text);
      setState(text.includes('slug_taken') ? 'slug' : 'error');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md border rounded-lg bg-card p-8 text-center shadow-sm">
        {state === 'working' && <><Skeleton className="mx-auto h-10 w-10 rounded-full" />
          <h1 className="mt-4 text-xl font-semibold">Completing your account…</h1></>}
        {state === 'confirmed' && <><CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Account ready</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your email is verified and any pending registration or invitation is complete.</p>
          <Button asChild className="mt-6 w-full"><Link to="/dashboard">Open workspace</Link></Button></>}
        {state === 'slug' && <form onSubmit={chooseSlug} className="space-y-4 text-left">
          <h1 className="text-xl font-semibold">Choose another organisation URL</h1>
          <p className="text-sm text-muted-foreground">That URL is already taken. Your other details are saved.</p>
          <label htmlFor="new-org-slug" className="block text-sm font-medium">Organisation URL</label>
          <Input id="new-org-slug" value={slug} onChange={event => setSlug(event.target.value.toLowerCase())}
            pattern="[a-z0-9-]{3,}" required minLength={3} />
          <Button type="submit" className="w-full">Finish registration</Button>
        </form>}
        {state === 'error' && <><AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Account completion failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <Button asChild variant="outline" className="mt-6 w-full"><Link to="/auth">Back to sign in</Link></Button></>}
      </div>
    </main>
  );
}
