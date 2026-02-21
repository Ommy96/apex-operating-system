import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquarePlus, Mail, Phone, MessageCircle, User } from "lucide-react";
import { useCommunications } from "@/hooks/useCommunications";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const channelIcons: Record<string, any> = {
  internal: MessageCircle,
  email: Mail,
  sms: Phone,
  phone: Phone,
  in_person: User,
};

const channelColors: Record<string, string> = {
  internal: "bg-primary/10 text-primary",
  email: "bg-info/10 text-info",
  sms: "bg-success/10 text-success",
  phone: "bg-warning/10 text-warning",
  in_person: "bg-accent/10 text-accent",
};

export function StakeholderMessages() {
  const { messages, loadingMessages, createMessage } = useCommunications();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    channel: "internal",
    recipient_type: "beneficiary",
    recipient_name: "",
    recipient_contact: "",
    subject: "",
    body: "",
  });

  const handleSubmit = () => {
    if (!form.recipient_name || !form.body) return;
    createMessage.mutate(form, {
      onSuccess: () => {
        setOpen(false);
        setForm({ channel: "internal", recipient_type: "beneficiary", recipient_name: "", recipient_contact: "", subject: "", body: "" });
      },
    });
  };

  if (loadingMessages) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Stakeholder Messages</h3>
          <p className="text-xs text-muted-foreground">{messages.length} communications logged</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Log Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Communication</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Channel</label>
                  <Select value={form.channel} onValueChange={(v) => setForm(f => ({ ...f, channel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Recipient Type</label>
                  <Select value={form.recipient_type} onValueChange={(v) => setForm(f => ({ ...f, recipient_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beneficiary">Beneficiary</SelectItem>
                      <SelectItem value="donor">Donor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Recipient Name</label>
                <Input value={form.recipient_name} onChange={(e) => setForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="Recipient name" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Contact (optional)</label>
                <Input value={form.recipient_contact} onChange={(e) => setForm(f => ({ ...f, recipient_contact: e.target.value }))} placeholder="Email or phone" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Subject (optional)</label>
                <Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Message</label>
                <Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Message content..." rows={4} />
              </div>
              <Button onClick={handleSubmit} disabled={createMessage.isPending} className="w-full">
                {createMessage.isPending ? "Saving..." : "Log Message"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {messages.map((msg: any) => {
          const Icon = channelIcons[msg.channel] || MessageCircle;
          return (
            <Card key={msg.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`p-1.5 rounded-lg shrink-0 ${channelColors[msg.channel] || ""}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{msg.recipient_name || "Unknown"}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{msg.channel}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{msg.direction}</Badge>
                  </div>
                  {msg.subject && <p className="text-xs font-medium text-foreground">{msg.subject}</p>}
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{msg.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No messages logged yet</div>
        )}
      </div>
    </div>
  );
}
