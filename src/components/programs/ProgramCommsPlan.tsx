import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, ExternalLink, Trash2, Pencil, Newspaper, Share2, Tv, Video, BookOpen, Calendar, Award } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  programId?: string;
  projectId?: string;
  orgId?: string;
}

const OUTPUT_TYPES = [
  { value: "press_release", label: "Press Release", icon: Newspaper },
  { value: "social_post", label: "Social Post", icon: Share2 },
  { value: "media_mention", label: "Media Mention", icon: Tv },
  { value: "video", label: "Video", icon: Video },
  { value: "publication", label: "Publication", icon: BookOpen },
  { value: "event", label: "Event", icon: Calendar },
  { value: "donor_visibility", label: "Donor Visibility", icon: Award },
  { value: "other", label: "Other", icon: Megaphone },
];

const STATUS_COLORS: Record<string, string> = {
  planned: "status-badge-muted",
  in_progress: "status-badge-warning",
  published: "status-badge-success",
  cancelled: "status-badge-danger",
};

const emptyForm = {
  title: "", description: "", output_type: "press_release", channel: "",
  donor_name: "", planned_date: "", published_date: "", audience_reach: "",
  url: "", status: "planned", tags: "",
};

export function ProgramCommsPlan({ programId, projectId, orgId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openSheet, setOpenSheet] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: outputs = [], isLoading } = useQuery({
    queryKey: ["program-comms-outputs", programId, projectId, orgId],
    queryFn: async () => {
      let q = supabase
        .from("program_comms_outputs")
        .select("*")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("planned_date", { ascending: false, nullsFirst: false });
      if (projectId) q = q.eq("project_id", projectId);
      else if (programId) q = q.eq("program_id", programId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => outputs.filter((o: any) =>
    (statusFilter === "all" || o.status === statusFilter) &&
    (typeFilter === "all" || o.output_type === typeFilter)
  ), [outputs, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = outputs.length;
    const published = outputs.filter((o: any) => o.status === "published").length;
    const planned = outputs.filter((o: any) => o.status === "planned").length;
    const reach = outputs.reduce((s: number, o: any) => s + (Number(o.audience_reach) || 0), 0);
    return { total, published, planned, reach };
  }, [outputs]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title is required");
      const payload: any = {
        organization_id: orgId!,
        program_id: programId || null,
        project_id: projectId || null,
        title: form.title,
        description: form.description || null,
        output_type: form.output_type,
        channel: form.channel || null,
        donor_name: form.donor_name || null,
        planned_date: form.planned_date || null,
        published_date: form.published_date || null,
        audience_reach: form.audience_reach ? parseInt(form.audience_reach) : null,
        url: form.url || null,
        status: form.status,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        updated_by: user?.id,
      };
      if (editingId) {
        const { error } = await supabase.from("program_comms_outputs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("program_comms_outputs").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Updated" : "Comms output added");
      qc.invalidateQueries({ queryKey: ["program-comms-outputs"] });
      setOpenSheet(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_comms_outputs").update({ deleted_at: new Date().toISOString(), updated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["program-comms-outputs"] });
    },
  });

  const startEdit = (o: any) => {
    setEditingId(o.id);
    setForm({
      title: o.title || "", description: o.description || "", output_type: o.output_type || "press_release",
      channel: o.channel || "", donor_name: o.donor_name || "",
      planned_date: o.planned_date || "", published_date: o.published_date || "",
      audience_reach: o.audience_reach?.toString() || "", url: o.url || "",
      status: o.status || "planned", tags: (o.tags || []).join(", "),
    });
    setOpenSheet(true);
  };

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenSheet(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Communications & Visibility Plan</h2>
          <p className="text-sm text-muted-foreground">Track press, social, media mentions and donor visibility deliverables.</p>
        </div>
        <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New Output</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Outputs</p><p className="text-2xl font-semibold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Published</p><p className="text-2xl font-semibold text-emerald-600">{stats.published}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Planned</p><p className="text-2xl font-semibold">{stats.planned}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Reach</p><p className="text-2xl font-semibold">{stats.reach.toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {OUTPUT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No comms outputs yet. Add a press release, social post, or media mention to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((o: any) => {
            const typeMeta = OUTPUT_TYPES.find(t => t.value === o.output_type) || OUTPUT_TYPES[OUTPUT_TYPES.length - 1];
            const Icon = typeMeta.icon;
            return (
              <Card key={o.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{o.title}</p>
                            <Badge variant="outline" className="text-xs">{typeMeta.label}</Badge>
                            <Badge className={`text-xs ${STATUS_COLORS[o.status] || ""}`}>{o.status.replace("_", " ")}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            {o.channel && <span>Channel: {o.channel}</span>}
                            {o.donor_name && <span>Donor: {o.donor_name}</span>}
                            {o.planned_date && <span>Planned: {format(new Date(o.planned_date), "MMM d, yyyy")}</span>}
                            {o.published_date && <span>Published: {format(new Date(o.published_date), "MMM d, yyyy")}</span>}
                            {o.audience_reach != null && <span>Reach: {Number(o.audience_reach).toLocaleString()}</span>}
                          </div>
                          {o.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{o.description}</p>}
                          {o.tags?.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {o.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {o.url && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                              <a href={o.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(o)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete output?")) softDelete.mutate(o.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={openSheet} onOpenChange={(v) => { setOpenSheet(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? "Edit" : "New"} Comms Output</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={form.output_type} onValueChange={v => setForm({ ...form, output_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OUTPUT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Channel</Label>
                <Input placeholder="e.g. Twitter, Daily Nation, YouTube" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} />
              </div>
              <div>
                <Label>Donor Visibility</Label>
                <Input placeholder="Donor name (if applicable)" value={form.donor_name} onChange={e => setForm({ ...form, donor_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Planned Date</Label>
                <Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} />
              </div>
              <div>
                <Label>Published Date</Label>
                <Input type="date" value={form.published_date} onChange={e => setForm({ ...form, published_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Audience Reach</Label>
                <Input type="number" min="0" value={form.audience_reach} onChange={e => setForm({ ...form, audience_reach: e.target.value })} />
              </div>
              <div>
                <Label>URL</Label>
                <Input type="url" placeholder="https://..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="e.g. health, youth, q1-2026" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
              {editingId ? "Update" : "Create"} Output
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}