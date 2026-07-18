import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Send, Mail, Phone, Plus, Trash2, MessageCircle, Newspaper } from "lucide-react";
import { useCommunications } from "@/hooks/useCommunications";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sending: "bg-warning/10 text-warning",
  sent: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
  channel: string;
}

export function CampaignManager() {
  const { campaigns, loadingCampaigns, createCampaign, sendCampaign, deleteCampaign } = useCommunications();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    channel: "email",
    subject: "",
    body: "",
    target_audience: "all",
  });
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecip, setNewRecip] = useState({ name: "", email: "", phone: "" });

  const addRecipient = () => {
    if (!newRecip.name) return;
    setRecipients([...recipients, {
      name: newRecip.name,
      email: newRecip.email || undefined,
      phone: newRecip.phone || undefined,
      channel: form.channel === "both" ? (newRecip.email ? "email" : "sms") : form.channel,
    }]);
    setNewRecip({ name: "", email: "", phone: "" });
  };

  const handleCreate = () => {
    if (!form.name || !form.body || recipients.length === 0) return;
    createCampaign.mutate({ ...form, recipients }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ name: "", description: "", channel: "email", subject: "", body: "", target_audience: "all" });
        setRecipients([]);
      },
    });
  };

  if (loadingCampaigns) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Campaigns</h3>
          <p className="text-xs text-muted-foreground">{campaigns.length} campaigns</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Campaign Name</label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly Newsletter" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Channel</label>
                  <Select value={form.channel} onValueChange={(v) => setForm(f => ({ ...f, channel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Audience</label>
                  <Select value={form.target_audience} onValueChange={(v) => setForm(f => ({ ...f, target_audience: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="beneficiaries">Beneficiaries</SelectItem>
                      <SelectItem value="donors">Donors</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="guardians">Guardians</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(form.channel === "email" || form.channel === "both") && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Subject</label>
                  <Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject line" />
                </div>
              )}
              {form.channel === "whatsapp" && (
                <div className="space-y-2">
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-[11px] text-muted-foreground">
                    WhatsApp Business requires an <strong>approved template</strong> for messages outside a 24h session.
                    Enter the template name below, or leave blank to send as free-form text (only works if the recipient messaged you in the last 24h).
                  </div>
                  <label className="text-xs font-medium mb-1 block">Approved Template Name (optional)</label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="e.g. donation_receipt"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1 block">Message Body</label>
                <Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Campaign message..." rows={4} />
              </div>

              {/* Recipients */}
              <div>
                <label className="text-xs font-medium mb-1 block">Recipients ({recipients.length})</label>
                <div className="flex gap-2 mb-2">
                  <Input placeholder="Name" value={newRecip.name} onChange={(e) => setNewRecip(r => ({ ...r, name: e.target.value }))} className="flex-1" />
                  {(form.channel !== "sms") && (
                    <Input placeholder="Email" value={newRecip.email} onChange={(e) => setNewRecip(r => ({ ...r, email: e.target.value }))} className="flex-1" />
                  )}
                  {(form.channel !== "email") && (
                    <Input placeholder="Phone" value={newRecip.phone} onChange={(e) => setNewRecip(r => ({ ...r, phone: e.target.value }))} className="flex-1" />
                  )}
                  <Button size="icon" variant="outline" onClick={addRecipient}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                {recipients.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {recipients.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                        <span>{r.name} — {r.email || r.phone}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRecipients(recipients.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() =>
                  setForm((f) => ({ ...f, name: f.name || "Monthly Newsletter", channel: "email", target_audience: "all", subject: f.subject || "Our Monthly Newsletter" }))
                } className="gap-1.5">
                  <Newspaper className="h-3.5 w-3.5" /> Newsletter preset
                </Button>
              </div>
              <Button onClick={handleCreate} disabled={createCampaign.isPending} className="w-full">
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {campaigns.map((c: any) => (
          <Card key={c.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{c.name}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[c.status] || ""}`}>{c.status}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {c.channel === "email" ? <Mail className="h-2.5 w-2.5 mr-1 inline" /> : <Phone className="h-2.5 w-2.5 mr-1 inline" />}
                      {c.channel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{c.body}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{c.total_recipients} recipients</span>
                    {c.sent_count > 0 && <span className="text-success">{c.sent_count} sent</span>}
                    {c.failed_count > 0 && <span className="text-destructive">{c.failed_count} failed</span>}
                    <span>{format(new Date(c.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => sendCampaign.mutate(c.id)}
                      disabled={sendCampaign.isPending}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCampaign.mutate(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No campaigns yet</div>
        )}
      </div>
    </div>
  );
}
