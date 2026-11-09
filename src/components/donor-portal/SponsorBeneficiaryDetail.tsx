import { useMemo, useState } from 'react';
import { format, differenceInYears } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { GraduationCap, FileText, ShieldCheck, Sparkles, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { useDonorFx } from '@/hooks/useDonorFx';
import { FxAmount } from './FxAmount';
import { toast } from 'sonner';
import { DonorPortrait, useInViewSignedPhoto } from './DonorPortrait';
import {
  CORRESPONDENCE_KIND_LETTER, CORRESPONDENCE_STATUS, DONOR_REQUEST_KIND, gradeChangeSince,
  isStatus, needStatusLabel, yearsSince,
} from '@/lib/donorProfile';
import { cn } from '@/lib/utils';

type ActionKind = typeof DONOR_REQUEST_KIND[keyof typeof DONOR_REQUEST_KIND] | 'letter';

/**
 * Sponsor share mode, rendered in-app.
 * NEVER shows: surname, exact location (village/sub-county), guardian details,
 * contact details, sensitive life events or other donors' contributions.
 * Without photo consent: no photo, no name, no initials.
 */
export function SponsorBeneficiaryDetail({
  data, academics, progression, loading,
}: { data: any; academics: any[]; progression: any[]; loading: boolean }) {
  const b = data?.beneficiary;
  const {
    enrollments, sharedBeneficiaryDocuments, getSharedDocumentUrl, currency, correspondence,
    fetchFundedNeeds, fetchBeneficiaryUpdates, fetchSharedUploads, sendCorrespondence,
  } = useDonorPortal();
  const fx = useDonorFx(currency);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const myEnrollments = useMemo(
    () => (enrollments || []).filter((e: any) => e.beneficiary_id === b?.id),
    [enrollments, b?.id],
  );
  const myDocs = useMemo(
    () => (sharedBeneficiaryDocuments || []).filter((d: any) => d.beneficiary_id === b?.id),
    [sharedBeneficiaryDocuments, b?.id],
  );

  const needsQ = useQuery({
    queryKey: ['donor-portal', 'funded-needs', b?.id],
    queryFn: () => fetchFundedNeeds(b.id),
    enabled: !!b?.id,
  });
  const updatesQ = useQuery({
    queryKey: ['donor-portal', 'latest-updates', b?.id],
    queryFn: async () => {
      const [updates, uploads] = await Promise.all([fetchBeneficiaryUpdates(b.id), fetchSharedUploads(b.id)]);
      const items = [
        ...updates.map((u: any) => ({ id: `u-${u.id}`, kind: 'update' as const, raw: u, category: u.update_type, title: u.title, date: u.approved_at || u.created_at, file: u.file_url })),
        ...uploads.map((u: any) => ({ id: `d-${u.id}`, kind: 'upload' as const, raw: u, category: u.document_type, title: u.document_name, date: u.shared_at || u.created_at, file: u.file_url })),
      ];
      return items.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 6);
    },
    enabled: !!b?.id,
  });

  if (!b) return null;

  const consented = !!b.consent_given;
  const name: string | null = consented ? (b.first_name || null) : null;
  const programmeName = myEnrollments[0]?.program?.name || null;
  const age = b.date_of_birth ? differenceInYears(new Date(), new Date(b.date_of_birth)) : null;
  const birthday = b.date_of_birth ? format(new Date(b.date_of_birth), 'd MMMM') : null;
  const since = data.donation_date ? format(new Date(data.donation_date), 'MMMM yyyy') : null;
  const hobbies: string[] = Array.isArray(b.hobbies_list) ? b.hobbies_list : [];
  const interests: string[] = Array.isArray(b.interests) ? b.interests : [];
  const chips = [...hobbies, ...interests, b.favourite_subject && `Loves ${b.favourite_subject}`, b.personal_strengths, b.career_ambition && `Wants to be: ${b.career_ambition}`].filter(Boolean) as string[];
  const years = yearsSince(data.donation_date);
  const gradeChange = gradeChangeSince(data.donation_date, b.grade, progression || []);
  const quote = consented
    ? (correspondence || []).find((c: any) => c.beneficiary_id === b.id && isStatus(c.status, CORRESPONDENCE_STATUS.APPROVED))
    : null;
  const subject = name || 'this participant';
  const placeLabel = b.county || null;

  const openDoc = async (doc: any) => {
    try {
      const url = await getSharedDocumentUrl(doc);
      if (url) window.open(url, '_blank', 'noopener');
      else toast.error('Could not open this document');
    } catch (e: any) {
      toast.error(`Could not open this document: ${e?.message || 'unknown error'}`);
    }
  };

  const submitAction = async () => {
    if (!action || !message.trim()) return;
    setSubmitting(true);
    try {
      if (action === 'letter') {
        await sendCorrespondence.mutateAsync({ beneficiaryId: b.id, message: message.trim(), kind: CORRESPONDENCE_KIND_LETTER });
        toast.success('Letter sent for review before it is passed on');
      } else {
        const { data: id, error } = await (supabase as any).rpc('create_donor_request', {
          _beneficiary: b.id, _kind: action, _purpose: message.trim(), _date: null,
        });
        if (error) throw error;
        if (!id) throw new Error('Request was not saved');
        toast.success('Request submitted for review');
      }
      setMessage(''); setAction(null);
    } catch (e: any) {
      toast.error(`Could not send: ${e?.message || 'unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const actionTitle = action === 'letter' ? `Write to ${subject}`
    : action === DONOR_REQUEST_KIND.VISIT_REPORT ? 'Request a visit report' : 'Request an update';

  return (
    <div className="donor-theme space-y-6 rounded-2xl p-4 sm:p-6">
      {/* Hero */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(300px,2fr)_3fr]">
        <DonorPortrait photoPath={b.photo_url} consented={consented} name={name} showReleaseBadge />

        <div className="flex min-w-0 flex-col gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.18em] text-donor-link">YOU HAVE SPONSORED</p>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-donor-heading sm:text-[46px]">
              {name || `A participant in the ${programmeName || 'sponsorship'} programme`}
            </h2>
            {(since || placeLabel) && (
              <p className="text-sm text-donor-secondary">
                {[since && `Since ${since}`, placeLabel].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              age != null && ['Age', `${age}`],
              birthday && ['Birthday', birthday],
              b.grade && ['School', b.grade],
              programmeName && ['Programme', programmeName],
            ].filter(Boolean).map(([k, v]: any) => (
              <div key={k} className="rounded-xl border border-border bg-donor-inset p-3">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="mt-1 truncate font-semibold text-donor-heading">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-3">
            <Button className="min-h-[44px] rounded-xl" onClick={() => setAction(DONOR_REQUEST_KIND.UPDATE)}>
              Request an update
            </Button>
            <Button variant="outline" className="min-h-[44px] rounded-xl" onClick={() => setAction(DONOR_REQUEST_KIND.VISIT_REPORT)}>
              Request a visit report
            </Button>
            {consented && name && (
              <Button variant="ghost" className="min-h-[44px] rounded-xl text-donor-link" onClick={() => setAction('letter')}>
                Write to {name}
              </Button>
            )}
          </div>

          {years != null && (
            <div className="rounded-2xl border border-donor-warm/40 bg-donor-inset p-4">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-donor-warm">
                <Sparkles aria-hidden="true" className="h-4 w-4" /> MILESTONE
              </p>
              <p className="mt-2 text-donor-heading">
                {years < 1 ? 'Less than a year' : `${years} ${years === 1 ? 'year' : 'years'}`} of your sponsorship
                {gradeChange ? `, from ${gradeChange.from} to ${gradeChange.to}.` : '.'}
              </p>
            </div>
          )}

          {data.amount_received ? (
            <p className="text-sm text-donor-secondary">
              Your recorded contribution:{' '}
              <FxAmount amount={Number(data.amount_received)} currency="KES" on={data.donation_date} fx={fx} className="font-semibold text-donor-heading" />
            </p>
          ) : null}
        </div>
      </section>

      {!consented && (
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            <h3 className="flex items-center gap-2 font-semibold text-donor-heading">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-donor-link" /> Why there is no name or photo
            </h3>
            <p className="text-sm text-donor-secondary">
              The guardian has not yet signed a photo and name release. Under the Kenya Data Protection Act,
              a participant's name and picture are shown to sponsors only once that consent is recorded.
            </p>
            <p className="text-sm text-donor-secondary">You can still see:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              <li>School progress</li>
              <li>What your giving funded</li>
              <li>Approved programme updates</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* About + What you fund */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-5">
            <h3 className="font-display text-lg font-semibold text-donor-heading">About {name || 'this participant'}</h3>
            {b.bio ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{b.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No profile has been shared yet.</p>
            )}
            {chips.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Interests">
                {chips.map((c) => (
                  <li key={c} className="rounded-full border border-border bg-donor-inset px-3 py-1 text-xs text-donor-secondary">{c}</li>
                ))}
              </ul>
            )}
            {quote && (
              <blockquote className="border-l-2 border-primary pl-4">
                <p className="text-sm italic text-foreground">“{quote.message}”</p>
                <footer className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(quote.reviewed_at || quote.created_at), 'd MMM yyyy')}
                </footer>
              </blockquote>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-5">
            <h3 className="font-display text-lg font-semibold text-donor-heading">What you fund</h3>
            {needsQ.isLoading ? (
              <Skeleton className="h-20" />
            ) : needsQ.error ? (
              <p role="alert" className="text-sm text-destructive">Could not load funded needs: {(needsQ.error as Error).message}</p>
            ) : needsQ.data?.length ? (
              <ul className="space-y-2">
                {needsQ.data.map((n) => {
                  const s = needStatusLabel(n.need_status);
                  return (
                    <li key={n.need_type_id} className="flex items-center justify-between gap-3 rounded-xl bg-donor-inset p-3 text-sm">
                      <span className="font-medium text-donor-heading">{n.need_name}</span>
                      <span className="flex items-center gap-2 text-donor-secondary">
                        <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full',
                          s.tone === 'met' && 'bg-primary', s.tone === 'partial' && 'bg-donor-warm',
                          s.tone === 'unmet' && 'bg-muted-foreground', s.tone === 'unknown' && 'border border-muted-foreground')} />
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No allocations from your giving have been recorded for this participant yet.</p>
            )}
            <p className="text-xs text-muted-foreground">Allocated from your giving, not estimated. Traced to recorded disbursements.</p>
          </CardContent>
        </Card>
      </section>

      {/* Latest */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-donor-heading">Latest from {placeLabel || 'the programme'}</h3>
        {updatesQ.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        ) : updatesQ.error ? (
          <p role="alert" className="text-sm text-destructive">Could not load updates: {(updatesQ.error as Error).message}</p>
        ) : updatesQ.data?.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {updatesQ.data.map((u) => <UpdateCard key={u.id} item={u} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No approved updates have been shared yet.</p>
        )}
      </section>

      {/* Progress */}
      <Card className="rounded-2xl">
        <CardContent className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-semibold text-donor-heading">
            <GraduationCap aria-hidden="true" className="h-4 w-4 text-donor-link" /> School progress
          </h3>
          {loading ? <Skeleton className="h-20" /> : academics.length ? (
            <ul className="space-y-2">
              {academics.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-xl bg-donor-inset p-3 text-sm">
                  <span className="text-donor-heading">{a.academic_year} · {a.term}</span>
                  <span className="flex items-center gap-3">
                    {a.total_marks != null && <span className="font-semibold">{a.total_marks}{a.out_of ? `/${a.out_of}` : ''}</span>}
                    {a.overall_grade && <Badge variant="outline">{a.overall_grade}</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No academic records shared yet.</p>}
        </CardContent>
      </Card>

      {/* Shared documents */}
      <Card className="rounded-2xl">
        <CardContent className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-semibold text-donor-heading">
            <FileText aria-hidden="true" className="h-4 w-4 text-donor-link" /> Documents shared with you
          </h3>
          {myDocs.length ? (
            <ul className="space-y-2">
              {myDocs.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-donor-inset p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-donor-heading">{d.document_name}</span>
                    <span className="text-xs text-muted-foreground">{d.document_type || 'document'} · {format(new Date(d.created_at), 'MMM d, yyyy')}</span>
                  </span>
                  <Button size="sm" variant="outline" className="min-h-[44px] rounded-xl" onClick={() => openDoc(d)}>View</Button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No documents have been shared for this beneficiary.</p>}
        </CardContent>
      </Card>

      <Dialog open={!!action} onOpenChange={(o) => { if (!o) setAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
            <DialogDescription>
              {action === 'letter'
                ? 'Your letter is reviewed by staff before it is passed on.'
                : 'Staff review every request. Nothing is shared with you until it is approved.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="donor-action-message">{action === 'letter' ? 'Your letter' : 'What would you like to know?'}</Label>
            <Textarea id="donor-action-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="min-h-[44px]" onClick={() => setAction(null)}>Cancel</Button>
            <Button className="min-h-[44px]" disabled={!message.trim() || submitting} onClick={submitAction}>
              {submitting ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)(\?|$)/i;

function UpdateCard({ item }: { item: { kind: 'update' | 'upload'; category?: string | null; title: string; date: string; file?: string | null } }) {
  const isImage = !!item.file && IMAGE_EXT.test(item.file);
  const ref = item.kind === 'upload' && item.file && !/^https?:\/\//i.test(item.file)
    ? `beneficiary-documents:${item.file.replace(/^beneficiary-documents\//, '')}` : item.file;
  const { ref: el, src, markFailed } = useInViewSignedPhoto(isImage ? ref : null, isImage);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div ref={el} className="aspect-[16/10] w-full bg-donor-inset">
        {src ? (
          <img src={src} alt="" onError={markFailed} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        {item.category && <p className="text-[11px] font-semibold uppercase tracking-wider text-donor-link">{String(item.category).replace(/_/g, ' ')}</p>}
        <h4 className="font-semibold text-donor-heading">{item.title}</h4>
        <p className="text-xs text-muted-foreground">{format(new Date(item.date), 'd MMM yyyy')}</p>
      </div>
    </article>
  );
}
