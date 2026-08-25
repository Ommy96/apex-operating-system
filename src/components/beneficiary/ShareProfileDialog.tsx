import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Download, Link2, Loader2, ShieldAlert, Copy, Ban, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';
import {
  downloadShareableProfile, SHARE_MODES, type ShareMode,
  type ShareNeed, type ShareMilestone, type ShareProgramme,
} from '@/lib/shareableProfile';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  beneficiary: any;
}

interface LinkRow {
  id: string; token: string; share_mode: string; expires_at: string;
  revoked_at: string | null; access_count: number; last_accessed_at: string | null;
}

export function ShareProfileDialog({ open, onOpenChange, beneficiary }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const branding = useBranding() as any;
  const orgId = currentOrganization?.organization_id;

  const [mode, setMode] = useState<ShareMode>('sponsor');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [hasPhotoConsent, setHasPhotoConsent] = useState<boolean | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);

  useEffect(() => {
    if (!open || !beneficiary?.id) return;
    (async () => {
      // Consent gate — a photo of a child never leaves without recorded consent.
      const { data: docs } = await (supabase as any)
        .from('consent_documents')
        .select('id, doc_type, expires_at, status')
        .eq('beneficiary_id', beneficiary.id)
        .is('deleted_at', null);
      const ok = (docs || []).some((d: any) =>
        ['photo_release', 'consent_form'].includes(d.doc_type) &&
        (!d.expires_at || new Date(d.expires_at) >= new Date()) &&
        (d.status ?? 'active') !== 'expired');
      setHasPhotoConsent(ok || !!beneficiary.consent_given);

      const { data: l } = await (supabase as any)
        .from('beneficiary_share_links')
        .select('id, token, share_mode, expires_at, revoked_at, access_count, last_accessed_at')
        .eq('beneficiary_id', beneficiary.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setLinks((l || []) as LinkRow[]);
    })();
  }, [open, beneficiary?.id, beneficiary?.consent_given]);

  const logExport = async (kind: 'pdf' | 'share_link', shareMode: ShareMode) => {
    try {
      await (supabase as any).from('audit_logs').insert({
        event_type: kind === 'pdf' ? 'beneficiary_profile_exported' : 'beneficiary_profile_link_created',
        entity_type: 'beneficiary',
        entity_id: beneficiary.id,
        user_id: user?.id ?? null,
        new_values: { share_mode: shareMode, kind } as any,
        metadata: { organization_id: orgId, share_mode: shareMode, kind, photo_included: !!hasPhotoConsent } as any,
      });
    } catch (e) {
      logger.warn('export audit failed', e);
    }
  };

  const collect = async () => {
    const [needsRes, eventsRes, svcRes, acadRes] = await Promise.all([
      (supabase as any).from('beneficiary_needs')
        .select('status, estimated_cost, funded_amount, currency, need_type:need_types(label)')
        .eq('beneficiary_id', beneficiary.id),
      (supabase as any).from('life_events')
        .select('title, occurred_on, is_sensitive, severity, category')
        .eq('beneficiary_id', beneficiary.id)
        .is('deleted_at', null)
        .order('occurred_on', { ascending: false }),
      (supabase as any).from('beneficiary_services')
        .select('enrolled_date, status, project_name, program:programs(name)')
        .eq('beneficiary_id', beneficiary.id),
      (supabase as any).from('academic_performance')
        .select('academic_year, term, overall_grade')
        .eq('beneficiary_id', beneficiary.id)
        .order('academic_year', { ascending: false })
        .limit(3),
    ]);

    const needs: ShareNeed[] = (needsRes.data || []).map((n: any) => ({
      label: n.need_type?.label || 'Support',
      status: n.status,
      estimated_cost: n.estimated_cost,
      funded_amount: n.funded_amount,
      currency: n.currency,
    }));

    // Sensitive life events are NEVER included in any share mode.
    const milestones: ShareMilestone[] = (eventsRes.data || [])
      .filter((e: any) => e.is_sensitive !== true)
      .filter((e: any) => !['safeguarding', 'legal', 'health'].includes(String(e.category || '').toLowerCase()))
      .filter((e: any) => !['high', 'critical'].includes(String(e.severity || '').toLowerCase()))
      .slice(0, 6)
      .map((e: any) => ({ title: e.title, occurred_on: e.occurred_on }));

    const programmes: ShareProgramme[] = (svcRes.data || []).map((s: any) => ({
      name: s.program?.name || s.project_name || 'Programme',
      support: s.status,
      enrolled_date: s.enrolled_date,
    }));

    const dates = (svcRes.data || []).map((s: any) => s.enrolled_date).filter(Boolean).sort();
    const yearsSupported = dates.length
      ? Math.max(0, Math.floor((Date.now() - new Date(dates[0]).getTime()) / (365.25 * 86400000)))
      : 0;

    return { needs, milestones, programmes, academics: acadRes.data || [], yearsSupported };
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const extra = await collect();
      await downloadShareableProfile({
        mode,
        beneficiary,
        hasPhotoConsent: !!hasPhotoConsent,
        organization: {
          name: currentOrganization?.organization_name || 'Organisation',
          logoUrl: branding?.logoUrl || null,
          primaryColor: branding?.primaryColor || null,
          contact: (currentOrganization as any)?.email || null,
        },
        servicesReceived: extra.programmes.length,
        ...extra,
      });
      await logExport('pdf', mode);
      toast.success('Profile exported', { description: `${SHARE_MODES.find(m => m.value === mode)?.label} · logged to audit trail` });
    } catch (e: any) {
      logger.error('profile export failed', e);
      toast.error('Could not export profile', { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const createLink = async () => {
    if (!orgId) return;
    setLinking(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      const { data, error } = await (supabase as any)
        .from('beneficiary_share_links')
        .insert({
          organization_id: orgId,
          beneficiary_id: beneficiary.id,
          token,
          share_mode: mode,
          expires_at: expires,
          created_by: user?.id ?? null,
        })
        .select('id, token, share_mode, expires_at, revoked_at, access_count, last_accessed_at')
        .single();
      if (error) throw error;
      setLinks((prev) => [data as LinkRow, ...prev]);
      await logExport('share_link', mode);
      const url = `${window.location.origin}/shared/profile/${token}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success('Share link created and copied', { description: `Expires ${format(new Date(expires), 'd MMM yyyy')}` });
    } catch (e: any) {
      logger.error('share link failed', e);
      toast.error('Could not create share link', { description: e?.message });
    } finally {
      setLinking(false);
    }
  };

  const revoke = async (l: LinkRow) => {
    const { error } = await (supabase as any)
      .from('beneficiary_share_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', l.id);
    if (error) return toast.error('Could not revoke');
    setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, revoked_at: new Date().toISOString() } : x)));
    toast.success('Link revoked');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share profile</DialogTitle>
          <DialogDescription>
            A profile of a person is a privacy artifact. Choose how much of it leaves the building.
          </DialogDescription>
        </DialogHeader>

        {hasPhotoConsent === false && (
          <Alert className="border-warning/40 bg-warning/5">
            <ShieldAlert className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              No photo-release consent on file — the photograph will be omitted and the document will say so.
            </AlertDescription>
          </Alert>
        )}
        {hasPhotoConsent === true && (
          <Alert className="border-success/40 bg-success/5">
            <ShieldCheck className="h-4 w-4 text-success" />
            <AlertDescription className="text-sm">Consent on file — photo may be included.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label>Share mode</Label>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as ShareMode)} className="space-y-2">
            {SHARE_MODES.map((m) => (
              <label
                key={m.value}
                htmlFor={`mode-${m.value}`}
                className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${mode === m.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
              >
                <RadioGroupItem value={m.value} id={`mode-${m.value}`} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.blurb}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <p className="text-xs text-muted-foreground">
          Safeguarding, legal and health life events are never included, in any mode. Every export is written to the audit log.
        </p>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="expiry-days">Share link expires after (days)</Label>
          <Input
            id="expiry-days" type="number" min={1} max={90} value={days}
            onChange={(e) => setDays(Math.min(90, Math.max(1, Number(e.target.value) || 7)))}
            className="w-28"
          />
          <p className="text-xs text-muted-foreground">
            A link is safer than a PDF that circulates forever — it expires, it is revocable, and every view is logged.
          </p>
        </div>

        {links.length > 0 && (
          <div className="space-y-2">
            <Label>Existing links</Label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {links.map((l) => {
                const dead = !!l.revoked_at || new Date(l.expires_at) < new Date();
                return (
                  <div key={l.id} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                    <Badge variant="outline" className="capitalize shrink-0">{l.share_mode}</Badge>
                    <span className={`min-w-0 truncate ${dead ? 'text-muted-foreground line-through' : ''}`}>
                      {l.revoked_at ? 'Revoked' : `Until ${format(new Date(l.expires_at), 'd MMM yyyy')}`} · {l.access_count} view{l.access_count === 1 ? '' : 's'}
                    </span>
                    <div className="ml-auto flex gap-1 shrink-0">
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7" disabled={dead}
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/shared/profile/${l.token}`);
                          toast.success('Link copied');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={dead} onClick={() => revoke(l)}>
                        <Ban className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={createLink} disabled={linking} className="w-full sm:w-auto">
            {linking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Create share link
          </Button>
          <Button onClick={handleExport} disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
