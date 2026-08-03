import { useState } from "react";
import { useDonationCampaigns, useCampaignDonations, DonationCampaign, slugify } from "@/hooks/useDonationCampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Copy, ExternalLink, Archive, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

export function CampaignsTab() {
  const { currentOrganization } = useOrganization();
  const orgSlug = (currentOrganization as any)?.organization_slug;
  const { list, create, remove } = useDonationCampaigns();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", story: "", image_url: "", target_amount: "" });
  const [detail, setDetail] = useState<DonationCampaign | null>(null);

  const publicUrl = (slug: string) =>
    `${window.location.origin}/give/${orgSlug}/${slug}`;

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(publicUrl(slug));
    toast.success("Link copied");
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    await create.mutateAsync({
      title: form.title,
      story: form.story || null,
      image_url: form.image_url || null,
      target_amount: Number(form.target_amount) || 0,
    });
    setOpen(false);
    setForm({ title: "", story: "", image_url: "", target_amount: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Donation Campaigns
          </h3>
          <p className="text-sm text-muted-foreground">
            Public fundraising pages with shareable links.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {list.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (list.data?.length || 0) === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm">Create one to start collecting public donations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.data!.map((c) => {
            const pct = c.target_amount > 0 ? Math.min(100, (c.raised_amount / c.target_amount) * 100) : 0;
            return (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setDetail(c)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">Created {format(new Date(c.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.currency} {Number(c.raised_amount).toLocaleString()}</span>
                    <span className="text-muted-foreground">of {c.currency} {Number(c.target_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.donor_count} donors</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); copyLink(c.slug); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
                        <a href={publicUrl(c.slug)} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Donation Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Help send Mary to school" />
              {form.title && (
                <p className="text-xs text-muted-foreground mt-1">
                  Link: <span className="font-mono">/give/{orgSlug}/{slugify(form.title)}</span>
                </p>
              )}
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Story</Label>
              <Textarea rows={5} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} placeholder="Tell donors why this matters..." />
            </div>
            <div>
              <Label>Target Amount (KES)</Label>
              <Input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && <CampaignDetail campaign={detail} publicUrl={publicUrl(detail.slug)} onArchive={async () => { await remove.mutateAsync(detail.id); setDetail(null); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignDetail({ campaign, publicUrl, onArchive }: { campaign: DonationCampaign; publicUrl: string; onArchive: () => void }) {
  const { data: donations, isLoading } = useCampaignDonations(campaign.id);
  const pct = campaign.target_amount > 0 ? Math.min(100, (campaign.raised_amount / campaign.target_amount) * 100) : 0;
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{campaign.title}</DialogTitle>
      </DialogHeader>
      <div className="flex items-center gap-2 text-sm">
        <Input readOnly value={publicUrl} className="text-xs" />
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copied"); }}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
        </Button>
      </div>
      <Card><CardContent className="p-4 space-y-2">
        <Progress value={pct} className="h-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-center text-sm">
          <div><p className="text-xs text-muted-foreground">Raised</p><p className="font-bold text-success">{campaign.currency} {Number(campaign.raised_amount).toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground">Goal</p><p className="font-bold">{campaign.currency} {Number(campaign.target_amount).toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground">Donors</p><p className="font-bold">{campaign.donor_count}</p></div>
        </div>
      </CardContent></Card>
      <div>
        <p className="text-sm font-semibold mb-2">Recent Donations</p>
        {isLoading ? <Skeleton className="h-24" /> : (donations?.length || 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No donations yet.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-auto">
            {donations!.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{d.is_anonymous ? "Anonymous" : d.donor_name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy HH:mm")} · {d.provider} · {d.status}</p>
                </div>
                <span className="font-semibold">{d.currency} {Number(d.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onArchive}><Archive className="h-4 w-4 mr-2" /> Archive</Button>
      </DialogFooter>
    </div>
  );
}