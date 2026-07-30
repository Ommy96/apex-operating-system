import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Settings, Server, Database, Mail, Globe, Lock, Clock, HardDrive,
  Shield, Bell, Palette, Save, RotateCcw, AlertTriangle, CheckCircle2,
} from 'lucide-react';

interface ConfigSection {
  key: string;
  label: string;
  icon: any;
  description: string;
}

const CONFIG_SECTIONS: ConfigSection[] = [
  { key: 'general', label: 'General', icon: Settings, description: 'Platform identity and defaults' },
  { key: 'auth', label: 'Authentication', icon: Lock, description: 'Auth policies and session config' },
  { key: 'storage', label: 'Storage & Limits', icon: HardDrive, description: 'Resource quotas and storage config' },
  { key: 'email', label: 'Email', icon: Mail, description: 'Email delivery and templates' },
  { key: 'maintenance', label: 'Maintenance', icon: Server, description: 'Maintenance mode and scheduled tasks' },
];

export function SystemConfiguration() {
  const [activeSection, setActiveSection] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Platform config state
  const [config, setConfig] = useState({
    platformName: 'Infera Platform',
    supportEmail: 'support@infera.io',
    defaultTimezone: 'Africa/Nairobi',
    defaultCurrency: 'KES',
    maintenanceMode: false,
    maintenanceMessage: '',
    signupsEnabled: true,
    trialDays: 14,
    maxLoginAttempts: 5,
    sessionTimeout: 480,
    enforce2FA: false,
    passwordMinLength: 8,
    requireSpecialChars: true,
    maxFileUploadMB: 10,
    maxStoragePerOrgGB: 5,
    maxUsersFreeTier: 5,
    maxBeneficiariesFreeTier: 100,
    maxUsersStarterTier: 25,
    maxBeneficiariesStarterTier: 500,
    maxUsersProfessionalTier: 100,
    maxBeneficiariesProfessionalTier: 5000,
    emailProvider: 'resend',
    emailFromName: 'Infera Platform',
    emailFromAddress: 'noreply@infera.io',
    emailRateLimit: 100,
    enableWelcomeEmail: true,
    enableDigestEmails: false,
    backupFrequency: 'daily',
    logRetentionDays: 90,
    scheduledMaintenanceAt: '',
  });

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setHasChanges(false);
    toast({ title: 'Configuration Saved', description: 'Platform settings have been updated successfully.' });
  };

  const handleReset = () => {
    setHasChanges(false);
    toast({ title: 'Changes Reverted', description: 'Configuration reset to last saved state.' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-muted-foreground">System Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage platform-wide settings, resource limits, and policies</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge className="bg-warning/20 text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3 mr-1" /> Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}
            className="border-border text-muted-foreground hover:bg-muted-foreground">
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}
            className="bg-gradient-to-r from-warning to-warning text-white hover:opacity-90">
            <Save className="h-4 w-4 mr-1" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Section Navigation */}
        <div className="space-y-1">
          {CONFIG_SECTIONS.map(section => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                activeSection === section.key
                  ? 'bg-muted-foreground/80 text-warning border border-warning/30'
                  : 'bg-muted-foreground/30 text-muted-foreground hover:bg-muted-foreground/60 border border-transparent'
              }`}
            >
              <section.icon className="h-4 w-4 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium">{section.label}</div>
                <div className="text-xs text-muted-foreground">{section.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Config Content */}
        <div className="space-y-4">
          {activeSection === 'general' && (
            <Card className="bg-muted-foreground/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2"><Settings className="h-5 w-5 text-warning" /> General Settings</CardTitle>
                <CardDescription className="text-muted-foreground">Core platform identity and regional defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Platform Name</Label>
                    <Input value={config.platformName} onChange={e => updateConfig('platformName', e.target.value)}
                      className="bg-muted-foreground/50 border-border text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Support Email</Label>
                    <Input value={config.supportEmail} onChange={e => updateConfig('supportEmail', e.target.value)}
                      className="bg-muted-foreground/50 border-border text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Default Timezone</Label>
                    <Select value={config.defaultTimezone} onValueChange={v => updateConfig('defaultTimezone', v)}>
                      <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                        <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                        <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Default Currency</Label>
                    <Select value={config.defaultCurrency} onValueChange={v => updateConfig('defaultCurrency', v)}>
                      <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KES">KES – Kenya Shilling</SelectItem>
                        <SelectItem value="USD">USD – US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR – Euro</SelectItem>
                        <SelectItem value="GBP">GBP – British Pound</SelectItem>
                        <SelectItem value="ZAR">ZAR – South African Rand</SelectItem>
                        <SelectItem value="NGN">NGN – Nigerian Naira</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Open Registration</div>
                    <div className="text-xs text-muted-foreground">Allow new organizations to self-register</div>
                  </div>
                  <Switch checked={config.signupsEnabled} onCheckedChange={v => updateConfig('signupsEnabled', v)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Free Trial Duration (days)</Label>
                  <Input type="number" value={config.trialDays} onChange={e => updateConfig('trialDays', parseInt(e.target.value))}
                    className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'auth' && (
            <Card className="bg-muted-foreground/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2"><Lock className="h-5 w-5 text-warning" /> Authentication & Security</CardTitle>
                <CardDescription className="text-muted-foreground">Login policies, session management, password rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Max Login Attempts</Label>
                    <Input type="number" value={config.maxLoginAttempts} onChange={e => updateConfig('maxLoginAttempts', parseInt(e.target.value))}
                      className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Session Timeout (minutes)</Label>
                    <Input type="number" value={config.sessionTimeout} onChange={e => updateConfig('sessionTimeout', parseInt(e.target.value))}
                      className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Min Password Length</Label>
                    <Input type="number" value={config.passwordMinLength} onChange={e => updateConfig('passwordMinLength', parseInt(e.target.value))}
                      className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'enforce2FA', label: 'Enforce 2FA for Admin Roles', desc: 'Require two-factor authentication for all admin and management users' },
                    { key: 'requireSpecialChars', label: 'Require Special Characters', desc: 'Passwords must contain at least one special character' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                      <Switch checked={(config as any)[item.key]} onCheckedChange={v => updateConfig(item.key, v)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'storage' && (
            <Card className="bg-muted-foreground/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2"><HardDrive className="h-5 w-5 text-warning" /> Storage & Resource Limits</CardTitle>
                <CardDescription className="text-muted-foreground">Configure per-tier resource quotas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Max File Upload (MB)</Label>
                    <Input type="number" value={config.maxFileUploadMB} onChange={e => updateConfig('maxFileUploadMB', parseInt(e.target.value))}
                      className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Max Storage / Org (GB)</Label>
                    <Input type="number" value={config.maxStoragePerOrgGB} onChange={e => updateConfig('maxStoragePerOrgGB', parseInt(e.target.value))}
                      className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Per-Tier Limits</h4>
                  {[
                    { tier: 'Free', users: 'maxUsersFreeTier', beneficiaries: 'maxBeneficiariesFreeTier', color: 'slate' },
                    { tier: 'Starter', users: 'maxUsersStarterTier', beneficiaries: 'maxBeneficiariesStarterTier', color: 'blue' },
                    { tier: 'Professional', users: 'maxUsersProfessionalTier', beneficiaries: 'maxBeneficiariesProfessionalTier', color: 'purple' },
                  ].map(({ tier, users, beneficiaries, color }) => (
                    <div key={tier} className="p-4 rounded-lg bg-muted-foreground/30 border border-border/30">
                      <div className="text-sm font-medium text-muted-foreground mb-3">{tier} Tier</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Users</Label>
                          <Input type="number" value={(config as any)[users]} onChange={e => updateConfig(users, parseInt(e.target.value))}
                            className="bg-muted-foreground/50 border-border text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Beneficiaries</Label>
                          <Input type="number" value={(config as any)[beneficiaries]} onChange={e => updateConfig(beneficiaries, parseInt(e.target.value))}
                            className="bg-muted-foreground/50 border-border text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'email' && (
            <Card className="bg-muted-foreground/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2"><Mail className="h-5 w-5 text-warning" /> Email Configuration</CardTitle>
                <CardDescription className="text-muted-foreground">Email delivery provider, sender identity, and templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email Provider</Label>
                    <Select value={config.emailProvider} onValueChange={v => updateConfig('emailProvider', v)}>
                      <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resend">Resend</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="ses">Amazon SES</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Rate Limit (per hour)</Label>
                    <Input type="number" value={config.emailRateLimit} onChange={e => updateConfig('emailRateLimit', parseInt(e.target.value))}
                      className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">From Name</Label>
                    <Input value={config.emailFromName} onChange={e => updateConfig('emailFromName', e.target.value)}
                      className="bg-muted-foreground/50 border-border text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">From Address</Label>
                    <Input value={config.emailFromAddress} onChange={e => updateConfig('emailFromAddress', e.target.value)}
                      className="bg-muted-foreground/50 border-border text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'enableWelcomeEmail', label: 'Welcome Emails', desc: 'Send welcome email on new user registration' },
                    { key: 'enableDigestEmails', label: 'Weekly Digest', desc: 'Send weekly activity digest to organization admins' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                      <Switch checked={(config as any)[item.key]} onCheckedChange={v => updateConfig(item.key, v)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'maintenance' && (
            <Card className="bg-muted-foreground/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2"><Server className="h-5 w-5 text-warning" /> Maintenance & Operations</CardTitle>
                <CardDescription className="text-muted-foreground">Maintenance mode, backups, and log retention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <div className="text-sm font-medium text-destructive">Maintenance Mode</div>
                    <div className="text-xs text-muted-foreground">Show maintenance page to all non-admin users</div>
                  </div>
                  <Switch checked={config.maintenanceMode} onCheckedChange={v => updateConfig('maintenanceMode', v)} />
                </div>
                {config.maintenanceMode && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Maintenance Message</Label>
                    <Textarea value={config.maintenanceMessage} onChange={e => updateConfig('maintenanceMessage', e.target.value)}
                      placeholder="We're performing scheduled maintenance. We'll be back shortly."
                      className="bg-muted-foreground/50 border-border text-muted-foreground" />
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Backup Frequency</Label>
                    <Select value={config.backupFrequency} onValueChange={v => updateConfig('backupFrequency', v)}>
                      <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Log Retention (days)</Label>
                    <Input type="number" value={config.logRetentionDays} onChange={e => updateConfig('logRetentionDays', parseInt(e.target.value))}
                      className="bg-muted-foreground/50 border-border text-muted-foreground w-32" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Scheduled Maintenance Window</Label>
                  <Input type="datetime-local" value={config.scheduledMaintenanceAt} onChange={e => updateConfig('scheduledMaintenanceAt', e.target.value)}
                    className="bg-muted-foreground/50 border-border text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
