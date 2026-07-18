import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrgBeneficiaryConfig, useInvalidateOrgBeneficiaryConfig, type OrgType } from '@/hooks/useOrgBeneficiaryConfig';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Loader2, Plus, X, GraduationCap, Heart, Briefcase, AlertTriangle, Globe, Users, Accessibility, Baby, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BeneficiaryCodeFormatCard } from './BeneficiaryCodeFormatCard';

interface OrgTypePreset {
  value: OrgType;
  label: string;
  description: string;
  icon: any;
  defaults: Partial<{
    collect_education_data: boolean;
    collect_health_data: boolean;
    collect_economic_data: boolean;
    collect_household_data: boolean;
    collect_religion: boolean;
    collect_hiv_status: boolean;
    collect_nutritional_status: boolean;
    collect_disability_details: boolean;
  }>;
}

const PRESETS: OrgTypePreset[] = [
  { value: 'education', label: 'Education / Child welfare', description: 'Schools, sponsorship, child protection', icon: GraduationCap,
    defaults: { collect_education_data: true, collect_health_data: true, collect_household_data: true, collect_religion: true, collect_economic_data: false, collect_hiv_status: false, collect_disability_details: true, collect_nutritional_status: true } },
  { value: 'health', label: 'Health & nutrition', description: 'HIV, TB, maternal, mental health', icon: Heart,
    defaults: { collect_health_data: true, collect_hiv_status: true, collect_nutritional_status: true, collect_disability_details: true, collect_education_data: false, collect_economic_data: false, collect_household_data: true, collect_religion: false } },
  { value: 'livelihood', label: 'Livelihoods & economic', description: 'Income generation, skills training', icon: Briefcase,
    defaults: { collect_economic_data: true, collect_education_data: false, collect_health_data: false, collect_household_data: true, collect_religion: false, collect_disability_details: true, collect_hiv_status: false, collect_nutritional_status: false } },
  { value: 'disaster_response', label: 'Disaster response', description: 'Emergency food, shelter, WASH', icon: AlertTriangle,
    defaults: { collect_health_data: true, collect_household_data: true, collect_nutritional_status: true, collect_disability_details: true, collect_economic_data: false, collect_education_data: false, collect_religion: false, collect_hiv_status: false } },
  { value: 'refugee', label: 'Refugee & displacement', description: 'Documentation, protection, resettlement', icon: Globe,
    defaults: { collect_health_data: true, collect_household_data: true, collect_education_data: true, collect_religion: true, collect_disability_details: true, collect_economic_data: true, collect_hiv_status: false, collect_nutritional_status: true } },
  { value: 'elderly', label: 'Elderly care', description: 'Aging support, chronic care', icon: Users,
    defaults: { collect_health_data: true, collect_disability_details: true, collect_household_data: true, collect_economic_data: true, collect_education_data: false, collect_religion: true, collect_hiv_status: false, collect_nutritional_status: true } },
  { value: 'disability', label: 'Disability inclusion', description: 'Persons with disabilities', icon: Accessibility,
    defaults: { collect_disability_details: true, collect_health_data: true, collect_education_data: true, collect_household_data: true, collect_economic_data: true, collect_religion: false, collect_hiv_status: false, collect_nutritional_status: false } },
  { value: 'child_welfare', label: 'Child welfare', description: 'Orphans, vulnerable children', icon: Baby,
    defaults: { collect_education_data: true, collect_health_data: true, collect_household_data: true, collect_religion: true, collect_disability_details: true, collect_hiv_status: true, collect_nutritional_status: true, collect_economic_data: false } },
  { value: 'general', label: 'General / Multi-sector', description: 'Multiple programme areas', icon: Building2,
    defaults: { collect_education_data: true, collect_health_data: true, collect_household_data: true, collect_religion: true, collect_economic_data: false, collect_hiv_status: false, collect_nutritional_status: false, collect_disability_details: false } },
];

const DEFAULT_TAGS = [
  'Orphan', 'Child-headed household', 'Person with disability', 'Chronic illness',
  'Extreme poverty', 'GBV survivor', 'Refugee/IDP', 'Elderly', 'Teen mother',
  'Street connected', 'Out of school',
];

export function BeneficiaryDataSettings() {
  const { config, isLoading } = useOrgBeneficiaryConfig();
  const { currentOrganization } = useOrganization();
  const invalidate = useInvalidateOrgBeneficiaryConfig();
  const orgId = currentOrganization?.organization_id;

  const [form, setForm] = useState(config);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const applyPreset = (preset: OrgTypePreset) => {
    setForm((p) => ({
      ...p,
      org_type: preset.value,
      ...preset.defaults,
    }));
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const existing = (form.custom_vulnerability_tags as string[]) || [];
    if (existing.includes(trimmed)) return;
    update('custom_vulnerability_tags', [...existing, trimmed] as any);
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    update(
      'custom_vulnerability_tags',
      ((form.custom_vulnerability_tags as string[]) || []).filter((t) => t !== tag) as any,
    );
  };

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const payload = {
        org_id: orgId,
        org_type: form.org_type,
        collect_education_data: form.collect_education_data,
        collect_health_data: form.collect_health_data,
        collect_economic_data: form.collect_economic_data,
        collect_household_data: form.collect_household_data,
        collect_religion: form.collect_religion,
        collect_hiv_status: form.collect_hiv_status,
        collect_nutritional_status: form.collect_nutritional_status,
        collect_disability_details: form.collect_disability_details,
        beneficiary_terminology: form.beneficiary_terminology || 'Beneficiary',
        beneficiary_terminology_plural: form.beneficiary_terminology_plural || null,
        custom_vulnerability_tags: form.custom_vulnerability_tags || [],
        custom_fields: form.custom_fields || [],
      };

      const { error } = await supabase
        .from('org_beneficiary_config' as any)
        .upsert(payload, { onConflict: 'org_id' });

      if (error) throw error;
      await invalidate();
      toast({ title: 'Settings saved' });
    } catch (e: any) {
      logger.error('Failed to save org beneficiary config', e);
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">What data do you collect about the people you serve?</h2>
        <p className="text-sm text-muted-foreground">
          Configure the registration form to match your organisation's focus. Sections you disable will not appear in registration forms or profiles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisation type</CardTitle>
          <CardDescription>Selecting a type auto-toggles the recommended data collection settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              const active = form.org_type === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    'text-left rounded-lg border p-3 transition-all',
                    active
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30',
                  )}
                >
                  <Icon className={cn('h-5 w-5 mb-2', active ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="font-medium text-sm">{p.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data sections</CardTitle>
          <CardDescription>Toggle the categories of data your team collects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow label="Education data" hint="School, grade, enrolment status"
            checked={form.collect_education_data} onChange={(v) => update('collect_education_data', v)} />
          <ToggleRow label="Health & medical data" hint="Allergies, conditions, blood group"
            checked={form.collect_health_data} onChange={(v) => update('collect_health_data', v)} />
          <ToggleRow label="Nutritional status" hint="Malnutrition assessment"
            checked={form.collect_nutritional_status} onChange={(v) => update('collect_nutritional_status', v)} />
          <ToggleRow label="HIV status" hint="Sensitive — visible only to permitted roles"
            checked={form.collect_hiv_status} onChange={(v) => update('collect_hiv_status', v)} />
          <ToggleRow label="Household economic data" hint="Occupation, income level"
            checked={form.collect_economic_data} onChange={(v) => update('collect_economic_data', v)} />
          <ToggleRow label="Household data" hint="Family size, head of household"
            checked={form.collect_household_data} onChange={(v) => update('collect_household_data', v)} />
          <ToggleRow label="Religion"
            checked={form.collect_religion} onChange={(v) => update('collect_religion', v)} />
          <ToggleRow label="Disability details"
            checked={form.collect_disability_details} onChange={(v) => update('collect_disability_details', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terminology</CardTitle>
          <CardDescription>What do you call the people you serve? This term replaces "Beneficiary" across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Singular</Label>
              <Input
                value={form.beneficiary_terminology || ''}
                onChange={(e) => update('beneficiary_terminology', e.target.value)}
                placeholder="Beneficiary"
              />
              <p className="text-xs text-muted-foreground mt-1">e.g. Patient, Client, Participant, Student, Member</p>
            </div>
            <div>
              <Label>Plural (optional)</Label>
              <Input
                value={form.beneficiary_terminology_plural || ''}
                onChange={(e) => update('beneficiary_terminology_plural', e.target.value)}
                placeholder="Auto: Beneficiaries"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to auto-pluralise.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom vulnerability tags</CardTitle>
          <CardDescription>Add tags specific to your context. Defaults are always available.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Default tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {DEFAULT_TAGS.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your custom tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {((form.custom_vulnerability_tags as string[]) || []).map((t) => (
                <Badge key={t} variant="outline" className="gap-1">
                  {t}
                  <button onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!form.custom_vulnerability_tags || (form.custom_vulnerability_tags as string[]).length === 0) && (
                <p className="text-xs text-muted-foreground">No custom tags yet.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="e.g. TB patient, Pregnant, Lactating mother"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addTag}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
