import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
  SECTOR_PRESETS,
  BENEFICIARY_TYPES,
  FUNDING_MODELS,
  REPORTING_STYLES,
  featuresFromChoices,
  type SectorKey,
  type BeneficiaryTypeKey,
  type FundingModelKey,
  type ReportingStyleKey,
  type SectorPreset,
} from '@/lib/setupWizardSectors';
import { logger } from '@/lib/logger';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL = 6;

const COUNTRIES = ['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'South Sudan', 'Somalia', 'Burundi', 'DRC', 'Nigeria', 'Ghana', 'Other'];

export default function OrgSetupWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reconfigure = params.get('reconfigure') === '1';
  const { currentOrganization, refreshOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [sector, setSector] = useState<SectorKey | null>(null);
  const [country, setCountry] = useState<string>('Kenya');
  const [regions, setRegions] = useState<string>('');
  const [bTypes, setBTypes] = useState<BeneficiaryTypeKey[]>([]);
  const [funding, setFunding] = useState<FundingModelKey[]>([]);
  const [reporting, setReporting] = useState<ReportingStyleKey | null>(null);

  // Hydrate from existing setup_config (for reconfigure)
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('setup_config,country,county' as any)
        .eq('id', orgId)
        .maybeSingle();
      const cfg: any = (data as any)?.setup_config || {};
      if (cfg.sector) setSector(cfg.sector);
      if (cfg.country) setCountry(cfg.country);
      else if ((data as any)?.country) setCountry((data as any).country);
      if (Array.isArray(cfg.regions)) setRegions(cfg.regions.join(', '));
      if (Array.isArray(cfg.beneficiary_types)) setBTypes(cfg.beneficiary_types);
      if (Array.isArray(cfg.funding_models)) setFunding(cfg.funding_models);
      if (cfg.reporting_style) setReporting(cfg.reporting_style);
    })();
  }, [orgId]);

  // Auto-fill beneficiary types when sector chosen and none picked yet
  useEffect(() => {
    if (sector && bTypes.length === 0) {
      const p = SECTOR_PRESETS.find((s) => s.key === sector);
      if (p) setBTypes(p.beneficiaryTypes);
    }
  }, [sector]);

  const preset: SectorPreset | null = useMemo(
    () => (sector ? SECTOR_PRESETS.find((s) => s.key === sector) || null : null),
    [sector]
  );

  const canNext = (): boolean => {
    switch (step) {
      case 1: return !!sector;
      case 2: return !!country;
      case 3: return bTypes.length > 0;
      case 4: return funding.length > 0;
      case 5: return !!reporting;
      default: return true;
    }
  };

  const next = () => setStep((s) => Math.min(TOTAL, s + 1) as Step);
  const back = () => setStep((s) => Math.max(1, s - 1) as Step);

  const skip = async () => {
    if (!orgId) return;
    await supabase
      .from('organizations')
      .update({ setup_completed: true, setup_completed_at: new Date().toISOString() } as any)
      .eq('id', orgId);
    toast.message('Setup skipped. You can reconfigure anytime from Organisation Settings.');
    navigate('/dashboard', { replace: true });
  };

  const finish = async () => {
    if (!orgId || !preset || !reporting) return;
    setSubmitting(true);
    try {
      const features = featuresFromChoices(preset, funding, reporting);
      const setup_config = {
        sector,
        country,
        regions: regions.split(',').map((r) => r.trim()).filter(Boolean),
        beneficiary_types: bTypes,
        funding_models: funding,
        reporting_style: reporting,
        version: 1,
        applied_at: new Date().toISOString(),
      };

      // 1) Merge features into organizations.features_enabled and mark setup complete
      const { data: orgRow } = await supabase
        .from('organizations').select('features_enabled,country' as any).eq('id', orgId).maybeSingle();
      const mergedFeatures = { ...(((orgRow as any)?.features_enabled) || {}), ...features };
      const orgUpdate: any = {
        setup_completed: true,
        setup_completed_at: new Date().toISOString(),
        setup_config,
        features_enabled: mergedFeatures,
      };
      if (!(orgRow as any)?.country) orgUpdate.country = country;
      await supabase.from('organizations').update(orgUpdate).eq('id', orgId);

      // 2) Upsert org_beneficiary_config (non-destructive merge of custom_fields)
      const { data: existingCfg } = await supabase
        .from('org_beneficiary_config' as any).select('*').eq('organization_id', orgId).maybeSingle();
      const existingFields: any[] = Array.isArray((existingCfg as any)?.custom_fields) ? (existingCfg as any).custom_fields : [];
      const existingNames = new Set(existingFields.map((f: any) => f?.name));
      const mergedFields = [...existingFields, ...preset.customFields.filter((f) => !existingNames.has(f.name))];
      const cfgPayload: any = {
        organization_id: orgId,
        org_type: preset.orgType,
        beneficiary_terminology: (existingCfg as any)?.beneficiary_terminology || preset.terminology,
        custom_fields: mergedFields,
        ...preset.configFlags,
        // store beneficiary type catalogue too so other modules can read it
        custom_vulnerability_tags: (existingCfg as any)?.custom_vulnerability_tags || [],
      };
      if (existingCfg) {
        await supabase.from('org_beneficiary_config' as any).update(cfgPayload).eq('organization_id', orgId);
      } else {
        await supabase.from('org_beneficiary_config' as any).insert(cfgPayload);
      }

      // 3) Seed starter logframe — only if none exists for the org (non-destructive)
      const { data: existingLogframes } = await supabase
        .from('logframes').select('id').eq('organization_id', orgId).limit(1);
      if (!existingLogframes || existingLogframes.length === 0) {
        const { data: lf } = await supabase
          .from('logframes')
          .insert({
            organization_id: orgId,
            title: preset.logframe.title,
            description: `Auto-generated by setup wizard for the ${preset.label} sector. Edit freely.`,
            status: 'draft',
            created_by: user?.id || null,
          })
          .select('id')
          .single();
        if (lf?.id) {
          const rows: any[] = [];
          rows.push({ logframe_id: lf.id, level_type: 'goal', title: preset.logframe.goal, sort_order: 0 });
          preset.logframe.outcomes.forEach((title, i) =>
            rows.push({ logframe_id: lf.id, level_type: 'outcome', title, sort_order: i + 1 })
          );
          preset.logframe.outputs.forEach((title, i) =>
            rows.push({ logframe_id: lf.id, level_type: 'output', title, sort_order: i + 10 })
          );
          await supabase.from('logframe_levels').insert(rows);
        }
      }

      // 4) Seed starter indicators if the org has none
      const { data: existingInd } = await supabase
        .from('indicators').select('id').eq('organization_id', orgId).limit(1);
      if (!existingInd || existingInd.length === 0) {
        const codePrefix = preset.key.toUpperCase().slice(0, 4);
        const indRows = preset.indicators.map((i, idx) => ({
          organization_id: orgId,
          code: `${codePrefix}-${String(idx + 1).padStart(3, '0')}`,
          name: i.name,
          unit: i.unit,
          level: i.level,
          formula_type: 'direct',
          publish_status: 'draft',
          is_template: false,
          created_by: user?.id || null,
        }));
        await supabase.from('indicators').insert(indRows as any);
      }

      await refreshOrganization();
      toast.success(reconfigure ? 'Organisation reconfigured.' : `${preset.label} setup applied. You're all set!`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      logger.error('Setup wizard failed', err);
      toast.error(err?.message || 'Failed to complete setup');
    } finally {
      setSubmitting(false);
    }
  };

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading organisation…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">{reconfigure ? 'Reconfigure Organisation' : 'Welcome to ApexOS — let’s set up your workspace'}</span>
          </div>
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Skip setup
          </button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span>Step {step} of {TOTAL}</span>
            <span>{Math.round((step / TOTAL) * 100)}%</span>
          </div>
          <Progress value={(step / TOTAL) * 100} className="h-1.5" />
        </div>

        <Card className="p-6 sm:p-10 border-border/60 shadow-sm">
          {step === 1 && (
            <StepShell
              title="What sector best describes your work?"
              subtitle="Pick one — we’ll pre-configure beneficiary types, fields and a starter logframe for it."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SECTOR_PRESETS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSector(s.key)}
                    className={`text-left rounded-xl border p-4 transition-all hover:border-primary/60 hover:bg-primary/5 ${
                      sector === s.key ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden>{s.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.blurb}</div>
                      </div>
                      {sector === s.key && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title="Where do you operate?"
              subtitle="Your primary country of operation, and any specific regions, counties or states (optional)."
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Primary country</label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCountry(c)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          country === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/60'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Operating regions / counties (optional)</label>
                  <Input
                    value={regions}
                    onChange={(e) => setRegions(e.target.value)}
                    placeholder="e.g. Nairobi, Kiambu, Machakos"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated. You can refine later in Settings.</p>
                </div>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              title="Who do you serve?"
              subtitle="Select all the beneficiary types your organisation works with."
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BENEFICIARY_TYPES.map((t) => {
                  const on = bTypes.includes(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() =>
                        setBTypes((curr) => (curr.includes(t.key) ? curr.filter((x) => x !== t.key) : [...curr, t.key]))
                      }
                      className={`px-3 py-3 rounded-lg border text-sm transition-all flex items-center justify-between gap-2 ${
                        on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60'
                      }`}
                    >
                      <span>{t.label}</span>
                      {on && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              {preset && (
                <p className="text-xs text-muted-foreground mt-4">
                  We pre-selected what’s typical for <span className="font-medium text-foreground">{preset.label}</span>. Adjust freely.
                </p>
              )}
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              title="How is your work funded?"
              subtitle="Pick all that apply. This shapes financial dashboards and reporting."
            >
              <div className="space-y-2">
                {FUNDING_MODELS.map((f) => {
                  const on = funding.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() =>
                        setFunding((curr) => (curr.includes(f.key) ? curr.filter((x) => x !== f.key) : [...curr, f.key]))
                      }
                      className={`w-full text-left rounded-xl border p-4 transition-all flex items-start gap-3 ${
                        on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60'
                      }`}
                    >
                      <Checkbox checked={on} className="mt-0.5 pointer-events-none" />
                      <div className="min-w-0">
                        <div className="font-medium">{f.label}</div>
                        <div className="text-xs text-muted-foreground">{f.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell
              title="What’s your reporting style?"
              subtitle="Pick the one that best matches how your team works today."
            >
              <div className="space-y-2">
                {REPORTING_STYLES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setReporting(r.key)}
                    className={`w-full text-left rounded-xl border p-4 transition-all flex items-start gap-3 ${
                      reporting === r.key ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border hover:border-primary/60'
                    }`}
                  >
                    <div className={`mt-1 h-4 w-4 rounded-full border-2 ${reporting === r.key ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                    <div className="min-w-0">
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 6 && preset && (
            <StepShell
              title="Review & confirm"
              subtitle="We’ll apply these defaults. Nothing is destructive — you can edit any of it in Settings."
            >
              <div className="space-y-3 text-sm">
                <Row label="Sector" value={`${preset.emoji} ${preset.label}`} />
                <Row label="Country" value={country} />
                {regions && <Row label="Regions" value={regions} />}
                <Row label="Beneficiary types" value={bTypes.map((b) => BENEFICIARY_TYPES.find((x) => x.key === b)?.label).filter(Boolean).join(', ')} />
                <Row label="Funding model" value={funding.map((f) => FUNDING_MODELS.find((x) => x.key === f)?.label).filter(Boolean).join(', ')} />
                <Row label="Reporting style" value={REPORTING_STYLES.find((x) => x.key === reporting)?.label || ''} />
                <div className="mt-5 rounded-lg border border-border/70 bg-muted/40 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">We’ll set up for you</div>
                  <ul className="text-sm space-y-1.5 list-disc list-inside text-foreground/80">
                    <li>{preset.customFields.length} sector-specific beneficiary fields</li>
                    <li>Starter logframe: <span className="font-medium">{preset.logframe.title}</span></li>
                    <li>{preset.indicators.length} starter indicators (draft)</li>
                    <li>Feature flags tuned to your funding & reporting choices</li>
                  </ul>
                </div>
              </div>
            </StepShell>
          )}

          {/* Footer nav */}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={back} disabled={step === 1 || submitting}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < TOTAL ? (
              <Button onClick={next} disabled={!canNext()} size="lg" className="min-w-32">
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={submitting} size="lg" className="min-w-40">
                {submitting ? 'Applying…' : reconfigure ? 'Apply changes' : 'Finish setup'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-2 mb-6">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/60 last:border-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wide w-32 shrink-0">{label}</span>
      <span className="text-right text-foreground">{value || '—'}</span>
    </div>
  );
}