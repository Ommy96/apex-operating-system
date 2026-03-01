import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSystemStats } from '@/hooks/useSystemAdmin';
import {
  Palette, Globe, Image, Type, Eye, Settings, CheckCircle2, XCircle,
  ExternalLink, Paintbrush, Layout, Monitor,
} from 'lucide-react';

interface TenantBranding {
  orgName: string;
  customDomain: string | null;
  domainVerified: boolean;
  logoUrl: string | null;
  primaryColor: string;
  hasCustomTheme: boolean;
  whiteLabeled: boolean;
}

const TENANT_BRANDING: TenantBranding[] = [
  { orgName: 'Hope Foundation', customDomain: 'app.hopefoundation.org', domainVerified: true, logoUrl: '/logo.png', primaryColor: '#2563EB', hasCustomTheme: true, whiteLabeled: true },
  { orgName: 'Children First Kenya', customDomain: 'portal.cfkenya.org', domainVerified: false, logoUrl: null, primaryColor: '#059669', hasCustomTheme: false, whiteLabeled: false },
  { orgName: 'Youth Empowerment', customDomain: null, domainVerified: false, logoUrl: null, primaryColor: '#7C3AED', hasCustomTheme: true, whiteLabeled: false },
  { orgName: 'Rural Health Initiative', customDomain: 'manage.ruralhealth.co.ke', domainVerified: true, logoUrl: '/logo.png', primaryColor: '#DC2626', hasCustomTheme: true, whiteLabeled: true },
  { orgName: 'Education Alliance', customDomain: null, domainVerified: false, logoUrl: null, primaryColor: '#D97706', hasCustomTheme: false, whiteLabeled: false },
];

export function WhiteLabelManagement() {
  const [activeView, setActiveView] = useState<'overview' | 'domains' | 'themes' | 'defaults'>('overview');
  const [allowCustomBranding, setAllowCustomBranding] = useState(true);
  const [allowCustomDomains, setAllowCustomDomains] = useState(true);
  const [defaultPrimaryColor, setDefaultPrimaryColor] = useState('#f59e0b');
  const [platformLogoUrl, setPlatformLogoUrl] = useState('');
  const [poweredByText, setPoweredByText] = useState('Powered by Infera');
  const [hidePoweredBy, setHidePoweredBy] = useState(false);

  const whiteLabeledCount = TENANT_BRANDING.filter(t => t.whiteLabeled).length;
  const customDomainCount = TENANT_BRANDING.filter(t => t.customDomain).length;
  const verifiedDomainCount = TENANT_BRANDING.filter(t => t.domainVerified).length;
  const customThemeCount = TENANT_BRANDING.filter(t => t.hasCustomTheme).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">White-Label Management</h2>
        <p className="text-sm text-slate-400">Manage tenant branding, custom domains, and theme customization</p>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'White-Labeled', value: whiteLabeledCount, icon: Paintbrush, accent: 'text-amber-400' },
          { label: 'Custom Domains', value: `${verifiedDomainCount}/${customDomainCount}`, icon: Globe, accent: 'text-blue-400' },
          { label: 'Custom Themes', value: customThemeCount, icon: Palette, accent: 'text-purple-400' },
          { label: 'Total Tenants', value: TENANT_BRANDING.length, icon: Layout, accent: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{label}</span>
              <Icon className={`h-4 w-4 ${accent}`} />
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Tenant Branding', icon: Eye },
          { key: 'domains', label: 'Custom Domains', icon: Globe },
          { key: 'themes', label: 'Theme Registry', icon: Palette },
          { key: 'defaults', label: 'Platform Defaults', icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={activeView === key ? 'default' : 'outline'} size="sm"
            onClick={() => setActiveView(key as any)}
            className={activeView === key
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
              : 'border-slate-600 text-slate-400 hover:bg-slate-700'
            }>
            <Icon className="h-4 w-4 mr-1" /> {label}
          </Button>
        ))}
      </div>

      {activeView === 'overview' && (
        <div className="space-y-3">
          {TENANT_BRANDING.map(tenant => (
            <div key={tenant.orgName} className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: tenant.primaryColor }}>
                {tenant.orgName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200">{tenant.orgName}</div>
                <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                  {tenant.customDomain && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {tenant.customDomain}
                    </span>
                  )}
                  {tenant.hasCustomTheme && <span className="flex items-center gap-1"><Palette className="h-3 w-3" /> Custom Theme</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {tenant.whiteLabeled && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">White-Labeled</Badge>
                )}
                {tenant.customDomain && (
                  <Badge variant="outline" className={tenant.domainVerified
                    ? 'border-emerald-500/30 text-emerald-400 text-xs'
                    : 'border-amber-500/30 text-amber-400 text-xs'
                  }>
                    {tenant.domainVerified ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</> : 'Pending DNS'}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'domains' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 text-sm">Custom Domain Registry</CardTitle>
            <CardDescription className="text-slate-400">All tenant custom domains and their verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TENANT_BRANDING.filter(t => t.customDomain).map(tenant => (
                <div key={tenant.orgName} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                  <div>
                    <div className="text-sm text-slate-200 font-mono">{tenant.customDomain}</div>
                    <div className="text-xs text-slate-500">{tenant.orgName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tenant.domainVerified ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        Pending Verification
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {TENANT_BRANDING.filter(t => !t.customDomain).length > 0 && (
                <div className="p-3 rounded-lg bg-slate-700/20 border border-dashed border-slate-600/30 text-center">
                  <span className="text-xs text-slate-500">{TENANT_BRANDING.filter(t => !t.customDomain).length} tenants using default domain</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'themes' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 text-sm">Theme Registry</CardTitle>
            <CardDescription className="text-slate-400">Custom brand colors and themes per tenant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TENANT_BRANDING.map(tenant => (
                <div key={tenant.orgName} className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-md" style={{ backgroundColor: tenant.primaryColor }} />
                    <div>
                      <div className="text-sm text-slate-200">{tenant.orgName}</div>
                      <div className="text-xs text-slate-500 font-mono">{tenant.primaryColor}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={tenant.hasCustomTheme ? 'border-purple-500/30 text-purple-400 text-xs' : 'border-slate-500/30 text-slate-500 text-xs'}>
                      {tenant.hasCustomTheme ? 'Custom' : 'Default'}
                    </Badge>
                    {tenant.logoUrl && <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">Has Logo</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'defaults' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 text-sm">Platform Branding Defaults</CardTitle>
            <CardDescription className="text-slate-400">Default branding applied to new tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { key: 'allowCustomBranding', label: 'Allow Custom Branding', desc: 'Let tenants customize logos, colors, and fonts', state: allowCustomBranding, setter: setAllowCustomBranding },
                { key: 'allowCustomDomains', label: 'Allow Custom Domains', desc: 'Let tenants connect their own domains', state: allowCustomDomains, setter: setAllowCustomDomains },
                { key: 'hidePoweredBy', label: 'Hide "Powered By" Badge', desc: 'Remove platform attribution (enterprise tier only)', state: hidePoweredBy, setter: setHidePoweredBy },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                  <Switch checked={item.state} onCheckedChange={item.setter} />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Default Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={defaultPrimaryColor} onChange={e => setDefaultPrimaryColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" />
                  <Input value={defaultPrimaryColor} onChange={e => setDefaultPrimaryColor(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-slate-200 font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">"Powered By" Text</Label>
                <Input value={poweredByText} onChange={e => setPoweredByText(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-slate-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
