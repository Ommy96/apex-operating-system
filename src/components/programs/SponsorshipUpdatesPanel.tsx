import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileText, Image as ImageIcon, Video, Mail, Plus, ScrollText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  beneficiaryId?: string;
}

const TYPE_ICONS: Record<string, any> = {
  letter: Mail,
  photo: ImageIcon,
  video: Video,
  report: ScrollText,
  note: FileText,
};

export function SponsorshipUpdatesPanel({ beneficiaryId }: Props) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    update_type: "note",
    title: "",
    content: "",
    file_url: "",
    scheduled_for: "",
    beneficiary_id: beneficiaryId || "",
  });

  const { data: updates, isLoading } = useQuery({
    queryKey: ["sponsorship-updates", orgId, beneficiaryId],
    queryFn: async () => {
      let q = supabase
        .from("sponsorship_updates" as any)
        .select("*, beneficiaries(id, display_name)")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (beneficiaryId) q = q.eq("beneficiary_id", beneficiaryId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: beneficiaries } = useQuery({
    queryKey: ["beneficiary-options-for-updates", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("beneficiaries")
        .select("id, display_name")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("display_name")
        .limit(500);
      return data || [];
    },
    enabled: !!orgId && !beneficiaryId,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No org");
      const bid = beneficiaryId || form.beneficiary_id;
      if (!bid) throw new Error("Select a beneficiary");
      if (!form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("sponsorship_updates" as any).insert({
        organization_id: orgId,
        beneficiary_id: bid,
        update_type: form.update_type,
        title: form.title,
        content: form.content || null,
        file_url: form.file_url || null,
        scheduled_for: form.scheduled_for || null,
        sent_at: form.scheduled_for ? null : new Date().toISOString(),
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Update saved");
      setOpen(false);
      setForm({ update_type: "note", title: "", content: "", file_url: "", scheduled_for: "", beneficiary_id: beneficiaryId || "" });
      qc.invalidateQueries({ queryKey: ["sponsorship-updates", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Sponsor Updates</h4>
          <p className="text-xs text-muted-foreground">Letters, photos, videos and reports shared with sponsors.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Update</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (updates?.length || 0) === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No updates yet.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {updates!.map((u: any) => {
            const Icon = TYPE_ICONS[u.update_type] || FileText;
            return (
              <Card key={u.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{u.title}</p>
                      <Badge variant="secondary" className="text-[10px]">{u.update_type}</Badge>
                      {u.scheduled_for && !u.sent_at && <Badge variant="outline" className="text-[10px]">scheduled</Badge>}
                    </div>
                    {!beneficiaryId && u.beneficiaries?.display_name && (
                      <p className="text-xs text-muted-foreground">For {u.beneficiaries.display_name}</p>
                    )}
                    {u.content && <p className="text-xs mt-1 line-clamp-2">{u.content}</p>}
                    {u.file_url && (
                      <a href={u.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Attachment</a>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(u.created_at), "MMM d, yyyy")}{u.scheduled_for && ` · scheduled ${format(new Date(u.scheduled_for), "MMM d")}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Sponsorship Update</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!beneficiaryId && (
              <div>
                <Label>Beneficiary</Label>
                <Select value={form.beneficiary_id} onValueChange={(v) => setForm({ ...form, beneficiary_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
                  <SelectContent>
                    {beneficiaries?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Type</Label>
              <Select value={form.update_type} onValueChange={(v) => setForm({ ...form, update_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="report">School / Progress Report</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Message / content</Label>
              <Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div>
              <Label>Attachment URL (photo/video/report)</Label>
              <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Schedule for (optional)</Label>
              <Input type="date" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}