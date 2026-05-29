import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrgBeneficiaryConfig, useInvalidateOrgBeneficiaryConfig } from '@/hooks/useOrgBeneficiaryConfig';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UnsavedBar } from '../UnsavedBar';
import { Upload, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { KENYA_COUNTIES } from '@/lib/kenyaCounties';

const TERMINOLOGIES = ['Beneficiary','Child','Client','Patient','Participant','Member','Student','Resident','Custom'];
const ORG_TYPES: Array<{ value: string; label: string; desc: string }> = [
  { value: 'child_welfare',     label: 'Child welfare / Education', desc: 'Children, schools, education' },
  { value: 'health',            label: 'Health & nutrition',         desc: 'Clinics, nutrition programmes' },
  { value: 'livelihood',        label: 'Livelihoods & economic empowerment', desc: 'Income, micro-enterprise' },
  { value: 'disaster_response', label: 'Disaster response & humanitarian', desc: 'Emergency response' },
  { value: 'refugee',           label: 'Refugee & displacement support', desc: 'Refugees, IDPs' },
  { value: 'elderly',           label: 'Elderly care', desc: 'Older persons' },
  { value: 'disability',        label: 'Disability inclusion', desc: 'PWDs, accessibility' },
  { value: 'general',           label: 'General / Multi-sector', desc: 'Multiple programme areas' },
  { value: 'other',             label: 'Other', desc: '' },
];
const OWNERSHIP = ['Public','Private','Faith-based','NGO','International NGO','CBO'];

interface OrgRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  physical_address: string | null;
  address: string | null;
  country: string | null;
  county: string | null;
  sub_county: string | null;
  year_founded: number | null;
  registration_number: string | null;
  pbo_number: string | null;
  pbo_expiry: string | null;
  ownership_type: string | null;
  logo_url: string | null;
}

export function ProfileSection() {
  const { currentOrganization, refreshOrganization } = useOrganization();
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const invalidateBenCfg = useInvalidateOrgBeneficiaryConfig();

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization-details', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
      if (error) throw error;
      return data as unknown as OrgRow;
    },
    enabled: !!orgId,
  });

  const { config: benCfg } = useOrgBeneficiaryConfig();

  type ProfileForm = {
    name: string;
    email: string;
    phone: string;
    website: string;
    description: string;
    physical_address: string;
    country: string;
    county: string;
    sub_county: string;
    year_founded: string;
    registration_number: string;
    pbo_number: string;
    pbo_expiry: string;
    ownership_type: string;
    logo_url: string;
    org_type: string;
    beneficiary_terminology: string;
  };

  const initial: ProfileForm | null = org && benCfg
    ? {
        name: org.name ?? '',
        email: org.email ?? '',
        phone: org.phone ?? '',
        website: org.website ?? '',
        description: org.description ?? '',
        physical_address: org.physical_address ?? org.address ?? '',
        country: org.country ?? 'Kenya',
        county: org.county ?? '',
        sub_county: org.sub_county ?? '',
        year_founded: org.year_founded ? String(org.year_founded) : '',
        registration_number: org.registration_number ?? '',
        pbo_number: org.pbo_number ?? '',
        pbo_expiry: org.pbo_expiry ?? '',
        ownership_type: org.ownership_type ?? '',
        logo_url: org.logo_url ?? '',
        org_type: benCfg.org_type ?? 'general',
        beneficiary_terminology: benCfg.beneficiary_terminology ?? 'Beneficiary',
      }
    : null;

  const form = useSettingsForm<ProfileForm>({
    initial,
    save: async (v) => {
      if (!orgId) throw new Error('No organisation');
      const { error: e1 } = await supabase
        .from('organizations')
        .update({
          name: v.name,
          email: v.email || null,
          phone: v.phone || null,
          website: v.website || null,
          description: v.description || null,
          physical_address: v.physical_address || null,
          country: v.country || null,
          county: v.county || null,
          sub_county: v.sub_county || null,
          year_founded: v.year_founded ? Number(v.year_founded) : null,
          registration_number: v.registration_number || null,
          pbo_number: v.pbo_number || null,
          pbo_expiry: v.pbo_expiry || null,
          ownership_type: v.ownership_type || null,
          logo_url: v.logo_url || null,
        } as any)
        .eq('id', orgId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('org_beneficiary_config' as any)
        .upsert({
          org_id: orgId,
          org_type: v.org_type as any,
          beneficiary_terminology: v.beneficiary_terminology,
        }, { onConflict: 'org_id' });
      if (e2) throw e2;
    },
    onSaved: () => {
      refreshOrganization();
      invalidateBenCfg();
    },
    invalidateKeys: [
      ['organization-details', orgId],
      ['org-branding', orgId],
    ],
    successMessage: 'Organisation profile saved',
  });

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${orgId}/logo.${ext}`;
      const { error } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('org-logos').getPublicUrl(path);
      form.setField('logo_url', urlData.publicUrl);
      toast({ title: 'Logo uploaded — remember to save' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading || !org) {
    return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const v = form.values;
  const counties = (KENYA_COUNTIES as any) || [];

  return (
    <div className="space-y-6">
      <UnsavedBar isDirty={form.isDirty} isSaving={form.isSaving} onSave={form.save} onReset={form.reset} disabled={!isAdmin} />

      {isAdmin && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Reconfigure Organisation</div>
                <div className="text-xs text-muted-foreground">Re-run the setup wizard to refresh sector defaults. Non-destructive — your existing data stays.</div>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/setup/wizard?reconfigure=1">Open wizard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
          <CardDescription>Logo, name, terminology and organisation type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {v.logo_url ? (
                <img src={v.logo_url} className="h-13 w-13 rounded-[10px] border object-contain bg-white p-1" style={{ height: 52, width: 52 }} alt="logo" />
              ) : (
                <div className="h-13 w-13 rounded-[10px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold" style={{ height: 52, width: 52 }}>
                  {(v.name || 'O').slice(0, 2).toUpperCase()}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadLogo} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || !isAdmin}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Change
              </Button>
              {v.logo_url && (
                <Button variant="ghost" size="sm" onClick={() => form.setField('logo_url', '')} disabled={!isAdmin}>
                  <X className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">PNG, JPG or WebP. Max 2MB.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Organisation name *</Label>
              <Input value={v.name} onChange={(e) => form.setField('name', e.target.value)} disabled={!isAdmin} />
              <p className="text-[11px] text-muted-foreground">Appears on all reports and PDF exports.</p>
            </div>
            <div className="space-y-1.5">
              <Label>What do you call the people you serve?</Label>
              <Select value={TERMINOLOGIES.includes(v.beneficiary_terminology) ? v.beneficiary_terminology : 'Custom'} onValueChange={(val) => form.setField('beneficiary_terminology', val === 'Custom' ? '' : val)} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TERMINOLOGIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              {!TERMINOLOGIES.slice(0, -1).includes(v.beneficiary_terminology) && (
                <Input className="mt-2" value={v.beneficiary_terminology} onChange={(e) => form.setField('beneficiary_terminology', e.target.value)} placeholder="Custom term" disabled={!isAdmin} />
              )}
              <p className="text-[11px] text-muted-foreground">System will use "{v.beneficiary_terminology || 'Beneficiary'}" throughout.</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Organisation type *</Label>
              <Select value={v.org_type} onValueChange={(val) => form.setField('org_type', val)} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Changing this updates default beneficiary data collection settings.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={v.description} onChange={(e) => form.setField('description', e.target.value)} disabled={!isAdmin} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact & location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Primary email *</Label><Input type="email" value={v.email} onChange={(e) => form.setField('email', e.target.value)} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={v.phone} onChange={(e) => form.setField('phone', e.target.value)} placeholder="+254 7XX XXX XXX" disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Website</Label><Input value={v.website} onChange={(e) => form.setField('website', e.target.value)} placeholder="https://" disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Year founded</Label><Input type="number" value={v.year_founded} onChange={(e) => form.setField('year_founded', e.target.value)} placeholder="2015" min={1900} max={new Date().getFullYear()} disabled={!isAdmin} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Physical address</Label><Textarea rows={2} value={v.physical_address} onChange={(e) => form.setField('physical_address', e.target.value)} disabled={!isAdmin} /></div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select value={v.country || 'Kenya'} onValueChange={(val) => form.setField('country', val)} disabled={!isAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Kenya">Kenya</SelectItem>
                <SelectItem value="Uganda">Uganda</SelectItem>
                <SelectItem value="Tanzania">Tanzania</SelectItem>
                <SelectItem value="Rwanda">Rwanda</SelectItem>
                <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {v.country === 'Kenya' && (
            <>
              <div className="space-y-1.5">
                <Label>County</Label>
                <Select value={v.county} onValueChange={(val) => form.setField('county', val)} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                  <SelectContent>
                    {Array.isArray(counties)
                      ? counties.map((c: any) => (
                          <SelectItem key={typeof c === 'string' ? c : c.name} value={typeof c === 'string' ? c : c.name}>
                            {typeof c === 'string' ? c : c.name}
                          </SelectItem>
                        ))
                      : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Sub-county</Label><Input value={v.sub_county} onChange={(e) => form.setField('sub_county', e.target.value)} disabled={!isAdmin} /></div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal registration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>NGO Board registration number</Label><Input value={v.registration_number} onChange={(e) => form.setField('registration_number', e.target.value)} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>PBO registration number</Label><Input value={v.pbo_number} onChange={(e) => form.setField('pbo_number', e.target.value)} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>PBO expiry date</Label><Input type="date" value={v.pbo_expiry || ''} onChange={(e) => form.setField('pbo_expiry', e.target.value)} disabled={!isAdmin} /></div>
          <div className="space-y-1.5">
            <Label>Ownership type</Label>
            <Select value={v.ownership_type} onValueChange={(val) => form.setField('ownership_type', val)} disabled={!isAdmin}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {OWNERSHIP.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground md:col-span-2">
            Upload the actual KRA, NGO Board and PBO certificates from the <span className="font-medium">Compliance documents</span> section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}