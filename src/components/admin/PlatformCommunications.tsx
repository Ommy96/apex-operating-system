import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  Megaphone, Bell, Mail, AlertTriangle, Send, Clock, CheckCircle2,
  Users, Building2, Globe, MessageSquare, Plus, Trash2, Eye,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'maintenance';
  audience: 'all' | 'admins' | 'specific';
  status: 'draft' | 'sent' | 'scheduled';
  sentAt?: string;
  scheduledAt?: string;
  recipientCount: number;
}

const ANNOUNCEMENTS: Announcement[] = [
  { id: '1', title: 'Platform Update v2.4', message: 'New features including bulk beneficiary import and enhanced reporting.', type: 'info', audience: 'all', status: 'sent', sentAt: '2026-02-28', recipientCount: 342 },
  { id: '2', title: 'Scheduled Maintenance – March 5', message: 'System will be offline from 2:00 AM to 4:00 AM EAT for database maintenance.', type: 'maintenance', audience: 'all', status: 'scheduled', scheduledAt: '2026-03-05T02:00', recipientCount: 342 },
  { id: '3', title: 'Security Advisory: Password Policy Update', message: 'All organizations must update passwords to meet new security requirements by March 15.', type: 'warning', audience: 'admins', status: 'sent', sentAt: '2026-02-25', recipientCount: 28 },
  { id: '4', title: 'New Pricing Tier Available', message: 'Introducing the Professional Plus tier with advanced analytics.', type: 'info', audience: 'admins', status: 'draft', recipientCount: 0 },
];

const TYPE_STYLES = {
  info: { color: 'text-info', bg: 'bg-info/10 border-info/30', icon: Bell },
  warning: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle },
  critical: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: AlertTriangle },
  maintenance: { color: 'text-info', bg: 'bg-info/10 border-info/30', icon: Clock },
};

const STATUS_STYLES = {
  draft: 'border-border/30 text-muted-foreground',
  sent: 'border-success/30 text-success',
  scheduled: 'border-warning/30 text-warning',
};

export function PlatformCommunications() {
  const [activeView, setActiveView] = useState<'announcements' | 'compose' | 'banners'>('announcements');
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerType, setBannerType] = useState('info');

  // Compose state
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeType, setComposeType] = useState<string>('info');
  const [composeAudience, setComposeAudience] = useState<string>('all');
  const [composeChannel, setComposeChannel] = useState<string>('in-app');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  const handleSend = () => {
    if (!composeTitle || !composeMessage) {
      toast({ title: 'Missing Fields', description: 'Title and message are required.', variant: 'destructive' });
      return;
    }
    toast({ title: scheduleEnabled ? 'Announcement Scheduled' : 'Announcement Sent', description: `Broadcast to ${composeAudience === 'all' ? 'all tenants' : 'organization admins'}.` });
    setComposeTitle('');
    setComposeMessage('');
    setActiveView('announcements');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-muted-foreground">Platform Communications</h2>
          <p className="text-sm text-muted-foreground">System announcements, maintenance notices, and broadcast messages</p>
        </div>
        <Button size="sm" onClick={() => setActiveView('compose')}
          className="bg-gradient-to-r from-warning to-warning text-white hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Total Sent', value: ANNOUNCEMENTS.filter(a => a.status === 'sent').length, icon: Send, accent: 'text-success' },
          { label: 'Scheduled', value: ANNOUNCEMENTS.filter(a => a.status === 'scheduled').length, icon: Clock, accent: 'text-warning' },
          { label: 'Drafts', value: ANNOUNCEMENTS.filter(a => a.status === 'draft').length, icon: MessageSquare, accent: 'text-muted-foreground' },
          { label: 'Total Reach', value: ANNOUNCEMENTS.reduce((s, a) => s + a.recipientCount, 0), icon: Users, accent: 'text-info' },
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
          { key: 'announcements', label: 'Announcements', icon: Megaphone },
          { key: 'compose', label: 'Compose', icon: Send },
          { key: 'banners', label: 'System Banner', icon: Globe },
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

      {activeView === 'announcements' && (
        <div className="space-y-3">
          {ANNOUNCEMENTS.map(ann => {
            const typeStyle = TYPE_STYLES[ann.type];
            const TypeIcon = typeStyle.icon;
            return (
              <div key={ann.id} className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${typeStyle.bg}`}>
                    <TypeIcon className={`h-4 w-4 ${typeStyle.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-muted-foreground">{ann.title}</h4>
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLES[ann.status]}`}>
                        {ann.status === 'sent' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {ann.status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                        {ann.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{ann.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {ann.audience === 'all' ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                        {ann.audience === 'all' ? 'All tenants' : 'Admins only'}
                      </span>
                      {ann.sentAt && <span>Sent: {ann.sentAt}</span>}
                      {ann.scheduledAt && <span>Scheduled: {new Date(ann.scheduledAt).toLocaleDateString()}</span>}
                      {ann.recipientCount > 0 && <span>{ann.recipientCount} recipients</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeView === 'compose' && (
        <Card className="bg-muted-foreground/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">Compose Announcement</CardTitle>
            <CardDescription className="text-muted-foreground">Broadcast a message to tenants across the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Title</Label>
              <Input value={composeTitle} onChange={e => setComposeTitle(e.target.value)} placeholder="Announcement title"
                className="bg-muted-foreground/50 border-border text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Message</Label>
              <Textarea value={composeMessage} onChange={e => setComposeMessage(e.target.value)} placeholder="Write your announcement..."
                className="bg-muted-foreground/50 border-border text-muted-foreground min-h-[120px]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Type</Label>
                <Select value={composeType} onValueChange={setComposeType}>
                  <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informational</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Audience</Label>
                <Select value={composeAudience} onValueChange={setComposeAudience}>
                  <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    <SelectItem value="admins">Org Admins Only</SelectItem>
                    <SelectItem value="specific">Specific Orgs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Channel</Label>
                <Select value={composeChannel} onValueChange={setComposeChannel}>
                  <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-app">In-App Notification</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="both">In-App + Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Schedule for Later</div>
                <div className="text-xs text-muted-foreground">Send at a specific date and time</div>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
            {scheduleEnabled && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Scheduled Date & Time</Label>
                <Input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                  className="bg-muted-foreground/50 border-border text-muted-foreground" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveView('announcements')}
                className="border-border text-muted-foreground hover:bg-muted-foreground">
                Cancel
              </Button>
              <Button onClick={handleSend}
                className="bg-gradient-to-r from-warning to-warning text-white hover:opacity-90">
                <Send className="h-4 w-4 mr-1" /> {scheduleEnabled ? 'Schedule' : 'Send Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'banners' && (
        <Card className="bg-muted-foreground/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">System-Wide Banner</CardTitle>
            <CardDescription className="text-muted-foreground">Display a persistent banner across all tenant dashboards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/30 bg-muted-foreground/20">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Show System Banner</div>
                <div className="text-xs text-muted-foreground">Visible to all users across all organizations</div>
              </div>
              <Switch checked={showBanner} onCheckedChange={setShowBanner} />
            </div>
            {showBanner && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Banner Type</Label>
                  <Select value={bannerType} onValueChange={setBannerType}>
                    <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (Blue)</SelectItem>
                      <SelectItem value="warning">Warning (Amber)</SelectItem>
                      <SelectItem value="critical">Critical (Red)</SelectItem>
                      <SelectItem value="maintenance">Maintenance (Purple)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Banner Message</Label>
                  <Textarea value={bannerMessage} onChange={e => setBannerMessage(e.target.value)} placeholder="Enter the banner message..."
                    className="bg-muted-foreground/50 border-border text-muted-foreground" />
                </div>
                {bannerMessage && (
                  <div>
                    <Label className="text-muted-foreground text-xs mb-2 block">Preview</Label>
                    <div className={`p-3 rounded-lg text-sm ${TYPE_STYLES[bannerType as keyof typeof TYPE_STYLES]?.bg || TYPE_STYLES.info.bg} ${TYPE_STYLES[bannerType as keyof typeof TYPE_STYLES]?.color || TYPE_STYLES.info.color}`}>
                      {bannerMessage}
                    </div>
                  </div>
                )}
                <Button onClick={() => toast({ title: 'Banner Updated', description: 'System banner is now visible to all users.' })}
                  className="bg-gradient-to-r from-warning to-warning text-white hover:opacity-90">
                  <Globe className="h-4 w-4 mr-1" /> Publish Banner
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
