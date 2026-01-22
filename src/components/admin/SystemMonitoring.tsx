import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useFeatureFlags, 
  useFeatureFlagManagement,
  usePlatformAnnouncements,
  useAnnouncementManagement,
  useSupportTickets,
  useTicketManagement,
} from '@/hooks/useSystemAdmin';
import { 
  Activity, 
  Flag,
  Megaphone,
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <AlertCircle className="h-4 w-4 text-orange-500" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  waiting_response: <MessageSquare className="h-4 w-4 text-purple-500" />,
  resolved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  closed: <CheckCircle2 className="h-4 w-4 text-gray-500" />,
};

export function SystemMonitoring() {
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags();
  const { toggleFlag, updateRollout } = useFeatureFlagManagement();
  const { data: announcements, isLoading: announcementsLoading } = usePlatformAnnouncements();
  const { createAnnouncement, toggleAnnouncement } = useAnnouncementManagement();
  const { data: tickets, isLoading: ticketsLoading } = useSupportTickets();
  const { updateTicketStatus } = useTicketManagement();

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info',
    target_audience: 'all',
    is_active: true,
    starts_at: new Date().toISOString(),
    ends_at: null as string | null,
  });
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);

  const handleCreateAnnouncement = () => {
    createAnnouncement.mutate(newAnnouncement);
    setAnnouncementDialogOpen(false);
    setNewAnnouncement({
      title: '',
      content: '',
      type: 'info',
      target_audience: 'all',
      is_active: true,
      starts_at: new Date().toISOString(),
      ends_at: null,
    });
  };

  const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress') || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="h-4 w-4" />
            Support Tickets
            {openTickets.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{openTickets.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-2">
            <Flag className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
        </TabsList>

        {/* Support Tickets */}
        <TabsContent value="tickets">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Support Tickets
              </CardTitle>
              <CardDescription>Manage support requests from organizations</CardDescription>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="mt-1">
                        {STATUS_ICONS[ticket.status]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{ticket.subject}</h4>
                          <Badge className={PRIORITY_COLORS[ticket.priority]}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {ticket.organization && (
                            <span>Org: {ticket.organization.name}</span>
                          )}
                          {ticket.user && (
                            <span>From: {ticket.user.email}</span>
                          )}
                          <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <Select 
                        value={ticket.status}
                        onValueChange={(value) => updateTicketStatus.mutate({ ticketId: ticket.id, status: value })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="waiting_response">Waiting</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No support tickets</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="flags">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Feature Flags
              </CardTitle>
              <CardDescription>Control feature availability across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {featureFlags?.map((flag) => (
                    <div key={flag.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={(checked) => toggleFlag.mutate({ flagId: flag.id, isEnabled: checked })}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{flag.flag_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {flag.flag_key}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {flag.target_tiers.map((tier) => (
                          <Badge key={tier} variant="secondary" className="text-xs">
                            {tier}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Platform Announcements
                  </CardTitle>
                  <CardDescription>Broadcast messages to all users</CardDescription>
                </div>
                <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Announcement
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Announcement</DialogTitle>
                      <DialogDescription>
                        This will be visible to all users on the platform
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          value={newAnnouncement.title}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                          placeholder="Announcement title"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Content</label>
                        <Textarea
                          value={newAnnouncement.content}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                          placeholder="Announcement content..."
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Type</label>
                          <Select 
                            value={newAnnouncement.type}
                            onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">Info</SelectItem>
                              <SelectItem value="warning">Warning</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Audience</label>
                          <Select 
                            value={newAnnouncement.target_audience}
                            onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, target_audience: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="admins">Admins Only</SelectItem>
                              <SelectItem value="organization_owners">Org Owners</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={handleCreateAnnouncement}
                        disabled={!newAnnouncement.title || !newAnnouncement.content || createAnnouncement.isPending}
                      >
                        {createAnnouncement.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Announcement
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : announcements && announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={(checked) => toggleAnnouncement.mutate({ id: announcement.id, isActive: checked })}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{announcement.title}</h4>
                          <Badge variant={announcement.type === 'critical' ? 'destructive' : 'secondary'}>
                            {announcement.type}
                          </Badge>
                          <Badge variant="outline">
                            {announcement.target_audience}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Created: {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No announcements yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
