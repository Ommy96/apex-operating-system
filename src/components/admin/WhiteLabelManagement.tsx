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
        <h2 className="text-xl font-bold text-muted-foreground">White-Label Management</h2>
        <p className="text-sm text-muted-foreground">Manage tenant branding, custom domains, and theme customization</p>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'White-Labeled', value: whiteLabeledCount, icon: Paintbrush, accent: 'text-warning' },
          { label: 'Custom Domains', value: `${verifiedDomainCount}/${customDomainCount}`, icon: Globe, accent: 'text-info' },
          { label: 'Custom Themes', value: customThemeCount, icon: Palette, accent: 'text-info' },
          { label: 'Total Tenants', value: TENANT_BRANDING.length, icon: Layout, accent: 'text-success' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${accent}`} />
            </div>
            <div className="text-xl font-bold text-muted-foreground font-mono">{value}</div>
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
              ? 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30'
              : 'border-border text-muted-foreground hover:bg-muted-foreground'
            }>
            <Icon className="h-4 w-4 mr-1" /> {label}
          </Button>
        ))}
      </div>

      {activeView === 'overview' && (
        <div className="space-y-3">
          {TENANT_BRANDING.map(tenant => (
            <div key={tenant.orgName} className="flex items-center gap-4 p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: tenant.primaryColor }}>
                {tenant.orgName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-muted-foreground">{tenant.orgName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
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
                  <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">White-Labeled</Badge>
                )}
                {tenant.customDomain && (
                  <Badge variant="outline" className={tenant.domainVerified
                    ? 'border-success/30 text-success text-xs'
                    : 'border-warning/30 text-warning text-xs'
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
        <Card className="bg-muted-foreground/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">Custom Domain Registry</CardTitle>
            <CardDescription className="text-muted-foreground">All tenant custom domains and their verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TENANT_BRANDING.filter(t => t.customDomain).map(tenant => (
                <div key={tenant.orgName} className="flex items-center justify-between p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
                  <div>
                    <div className="text-sm text-muted-foreground font-mono">{tenant.customDomain}</div>
                    <div className="text-xs text-muted-foreground">{tenant.orgName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tenant.domainVerified ? (
                      <Badge className="bg-success/20 text-success border-success/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                        Pending Verification
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {TENANT_BRANDING.filter(t => !t.customDomain).length > 0 && (
                <div className="p-3 rounded-lg bg-muted-foreground/20 border border-dashed border-border/30 text-center">
                  <span className="text-xs text-muted-foreground">{TENANT_BRANDING.filter(t => !t.customDomain).length} tenants using default domain</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'themes' && (
        <Card className="bg-muted-foreground/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">Theme Registry</CardTitle>
            <CardDescription className="text-muted-foreground">Custom brand colors and themes per tenant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TENANT_BRANDING.map(tenant => (
                <div key={tenant.orgName} className="p-4 rounded-lg bg-muted-foreground/30 border border-border/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-md" style={{ backgroundColor: tenant.primaryColor }} />
                    <div>
                      <div className="text-sm text-muted-foreground">{tenant.orgName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{tenant.primaryColor}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={tenant.hasCustomTheme ? 'border-info/30 text-info text-xs' : 'border-border/30 text-muted-foreground text-xs'}>
                      {tenant.hasCustomTheme ? 'Custom' : 'Default'}
                    </Badge>
                    {tenant.logoUrl && <Badge variant="outline" className="border-info/30 text-info text-xs">Has Logo</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'defaults' && (
        <Card className="bg-muted-foreground/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">Platform Branding Defaults</CardTitle>
            <CardDescription className="text-muted-foreground">Default branding applied to new tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { key: 'allowCustomBranding', label: 'Allow Custom Branding', desc: 'Let tenants customize logos, colors, and fonts', state: allowCustomBranding, setter: setAllowCustomBranding },
                { key: 'allowCustomDomains', label: 'Allow Custom Domains', desc: 'Let tenants connect their own domains', state: allowCustomDomains, setter: setAllowCustomDomains },
                { key: 'hidePoweredBy', label: 'Hide "Powered By" Badge', desc: 'Remove platform attribution (enterprise tier only)', state: hidePoweredBy, setter: setHidePoweredBy },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch checked={item.state} onCheckedChange={item.setter} />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Default Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={defaultPrimaryColor} onChange={e => setDefaultPrimaryColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" />
                  <Input value={defaultPrimaryColor} onChange={e => setDefaultPrimaryColor(e.target.value)}
                    className="bg-muted-foreground/50 border-border text-muted-foreground font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">"Powered By" Text</Label>
                <Input value={poweredByText} onChange={e => setPoweredByText(e.target.value)}
                  className="bg-muted-foreground/50 border-border text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
