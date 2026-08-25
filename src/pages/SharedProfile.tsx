import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert, Target, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Public, time-limited, revocable, access-logged rendering of a beneficiary profile.
 * All redaction happens server-side in get_shared_beneficiary_profile.
 */
export default function SharedProfile() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<any>(null);

  useDocumentTitle('Shared profile');

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: res, error: err } = await (supabase as any).rpc('get_shared_beneficiary_profile', { _token: token });
      if (err || !res || res.error) {
        setError(res?.error || 'not_found');
        setState('error');
        return;
      }
      setData(res);
      setState('ok');
    })();
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'error') {
    const msg = error === 'expired' ? 'This link has expired.'
      : error === 'revoked' ? 'This link has been revoked.'
      : 'This link is not valid.';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-3">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-semibold">{msg}</h1>
          <p className="text-sm text-muted-foreground">
            Profiles are shared for a limited time to protect the person they describe. Ask the organisation for a new link.
          </p>
        </div>
      </div>
    );
  }

  const b = data.beneficiary;
  const org = data.organization;
  const accent = org.primary_color || '#0F7B6C';
  const chips: string[] = [...(b.hobbies || []), ...(b.interests || [])];
  const needs: any[] = data.needs || [];
  const milestones: any[] = data.milestones || [];
  const statusLabel: Record<string, string> = { met: 'Met', partially_met: 'Partially met', unmet: 'Unmet' };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {org.logo_url && <img src={org.logo_url} alt="" className="h-8 w-auto object-contain" />}
            <span className="font-semibold truncate">{org.name}</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 capitalize">{data.share_mode} view</span>
        </div>
        <div style={{ height: 3, background: accent }} />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
          {b.photo_url ? (
            <img src={b.photo_url} alt={b.name} className="h-28 w-28 sm:h-36 sm:w-36 object-cover rounded-lg shrink-0" style={{ border: `2px solid ${accent}` }} />
          ) : (
            <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-lg bg-muted flex items-center justify-center shrink-0 text-3xl font-semibold text-muted-foreground">
              {(b.name || '?')[0]}
            </div>
          )}
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold break-words">{b.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[b.code ? `Ref ${b.code}` : null, b.age != null ? `${b.age} years` : null, b.county].filter(Boolean).join('  ·  ')}
            </p>
            {b.career_ambition && (
              <p className="inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1 text-white" style={{ background: accent }}>
                <Target className="h-3.5 w-3.5" /> Wants to be: {b.career_ambition}
              </p>
            )}
          </div>
        </section>

        {!data.photo_consent && (
          <p className="text-xs rounded-md border border-warning/40 bg-warning/5 p-3 text-muted-foreground">
            Photograph withheld — no photo-release consent is recorded for this person.
          </p>
        )}

        {b.bio && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Their story</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{b.bio}</p>
          </section>
        )}

        {(chips.length > 0 || b.favourite_subject || b.personal_strengths) && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accent }}>
              <Sparkles className="h-3.5 w-3.5" /> What they love
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span key={c} className="rounded-full bg-muted text-xs px-2.5 py-1">{c}</span>
              ))}
            </div>
            {b.favourite_subject && <p className="text-sm text-muted-foreground">Favourite subject: <span className="text-foreground">{b.favourite_subject}</span></p>}
            {b.personal_strengths && <p className="text-sm text-muted-foreground break-words">Strengths: <span className="text-foreground">{b.personal_strengths}</span></p>}
          </section>
        )}

        {(b.academic_level || b.grade || b.institution_name) && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Education</h2>
            <p className="text-sm">{[b.academic_level, b.grade, b.institution_name].filter(Boolean).join('  ·  ')}</p>
          </section>
        )}

        {needs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Needs</h2>
            <ul className="divide-y rounded-lg border">
              {needs.map((n, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="min-w-0 truncate">{n.label}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {statusLabel[n.status] || n.status}
                    {n.estimated_cost != null && ` · ${n.currency || 'KES'} ${Number(n.funded_amount || 0).toLocaleString()} of ${Number(n.estimated_cost).toLocaleString()}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {milestones.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Recent milestones</h2>
            <ul className="space-y-1.5">
              {milestones.slice(0, 6).map((m, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground w-20 shrink-0">{format(new Date(m.occurred_on), 'MMM yyyy')}</span>
                  <span className="min-w-0 break-words">{m.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <p>Confidential — shared in trust by {org.name}. Please do not republish or share this link onward.</p>
          <p>
            {org.contact ? `${org.contact} · ` : ''}
            Link expires {format(new Date(data.expires_at), 'd MMM yyyy')} · Every view is logged.
          </p>
        </footer>
      </main>
    </div>
  );
}
