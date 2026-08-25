import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, BookHeart, Image as ImageIcon, ShieldAlert, CheckCircle2, Send, Globe } from "lucide-react";
import { toast } from "sonner";

const THEMES = ["education", "health", "livelihoods", "WASH", "protection", "other"];
const STAGES = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
];

export default function ImpactStories() {
  const { currentOrganization } = useOrganization();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", project_id: "", program_id: "", beneficiary_id: "",
    story_text: "", theme: "other", tags: "", status: "draft",
  });
  const [photos, setPhotos] = useState<File[]>([]);

  const { data: stories = [] } = useQuery({
    queryKey: ["impact-stories", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_stories")
        .select("*, projects(name), beneficiaries:beneficiary_id(id, display_name, first_name, consent_given)")
        .eq("org_id", orgId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-stories", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, program_id").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs-list-stories", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("id, name").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiaries-for-stories", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("beneficiaries")
        .select("id, display_name, first_name, last_name, consent_given")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("display_name")
        .limit(1000);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Deep-link: /impact-stories?beneficiary=<id>
  useEffect(() => {
    const b = params.get("beneficiary");
    if (b) {
      setForm((p) => ({ ...p, beneficiary_id: b }));
      setCreateOpen(true);
      params.delete("beneficiary");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBeneficiary: any = useMemo(
    () => beneficiaries.find((b: any) => b.id === form.beneficiary_id),
    [beneficiaries, form.beneficiary_id],
  );
  const consentMissing = !!form.beneficiary_id && !selectedBeneficiary?.consent_given;

  const create = useMutation({
    mutationFn: async () => {
      if (consentMissing && photos.length > 0) {
        throw new Error("This beneficiary has no consent on file — photos cannot be attached.");
      }
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const path = `${orgId}/${Date.now()}_${photo.name}`;
        const { error } = await supabase.storage.from("impact-stories").upload(path, photo);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("impact-stories").getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }
      const linkedProject: any = projects.find((p: any) => p.id === form.project_id);
      const { error } = await supabase.from("impact_stories").insert({
        org_id: orgId!,
        title: form.title,
        project_id: form.project_id || null,
        program_id: (form.program_id || linkedProject?.program_id || null) as any,
        beneficiary_id: (form.beneficiary_id || null) as any,
        story_text: form.story_text || null,
        theme: form.theme,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
        status: form.status as any,
        submitted_at: form.status === "submitted" ? new Date().toISOString() : null,
        author_id: user?.id,
        photo_urls: photoUrls,
        consent_checked: !consentMissing,
        consent_checked_at: !consentMissing ? new Date().toISOString() : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impact-stories"] });
      toast.success("Story saved");
      setCreateOpen(false);
      setForm({ title: "", project_id: "", program_id: "", beneficiary_id: "", story_text: "", theme: "other", tags: "", status: "draft" });
      setPhotos([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const transition = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "submitted") patch.submitted_at = new Date().toISOString();
      if (status === "approved") { patch.approved_at = new Date().toISOString(); patch.approved_by = user?.id; }
      if (status === "published") patch.published_at = new Date().toISOString();
      const { error } = await supabase.from("impact_stories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impact-stories"] });
      toast.success("Story updated");
    },
    onError: (e: any) => toast.error(e.message || "Could not update story"),
  });

  const filtered = stories.filter(
    (s: any) =>
      (stage === "all" || (s.status || "draft") === stage) &&
      (!search || s.title?.toLowerCase().includes(search.toLowerCase())),
  );

  const beneficiaryName = (s: any) =>
    s.beneficiaries?.display_name || s.beneficiaries?.first_name || null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impact Stories</h1>
          <p className="text-sm text-muted-foreground">
            Capture stories of change — approved stories appear in the donor portal
          </p>
        </div>
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Story</Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle>New Impact Story</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>

              <div>
                <Label>Beneficiary</Label>
                <Select value={form.beneficiary_id} onValueChange={v => setForm(p => ({ ...p, beneficiary_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Who is this story about?" /></SelectTrigger>
                  <SelectContent>
                    {beneficiaries.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.display_name || `${b.first_name} ${b.last_name || ""}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {consentMissing && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    No consent on file for this beneficiary. You can still write the story, but photos
                    cannot be attached and the story will be shared without identifying details.
                  </AlertDescription>
                </Alert>
              )}

              <div><Label>Project</Label>
                <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Link to project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div><Label>Programme</Label>
                <Select value={form.program_id} onValueChange={v => setForm(p => ({ ...p, program_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Link to programme (optional)" /></SelectTrigger>
                  <SelectContent>{programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div><Label>Theme</Label>
                <Select value={form.theme} onValueChange={v => setForm(p => ({ ...p, theme: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div><Label>Story</Label><Textarea value={form.story_text} onChange={e => setForm(p => ({ ...p, story_text: e.target.value }))} rows={6} placeholder="Tell the impact story..." /></div>

              <div>
                <Label>Photos (up to 5)</Label>
                <Input
                  type="file" accept="image/*" multiple disabled={consentMissing}
                  onChange={e => setPhotos(Array.from(e.target.files || []).slice(0, 5))}
                />
                {consentMissing && <p className="text-xs text-muted-foreground mt-1">Photo upload disabled — consent required.</p>}
                {photos.length > 0 && <p className="text-xs text-muted-foreground mt-1">{photos.length} photo(s) selected</p>}
              </div>

              <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} /></div>

              <div><Label>Save as</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submit for approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">
                Save Story
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs value={stage} onValueChange={setStage}>
        <TabsList className="flex-wrap h-auto">
          {STAGES.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="text-xs">
              {s.label}
              <span className="ml-1 opacity-60">
                {s.key === "all" ? stories.length : stories.filter((x: any) => (x.status || "draft") === s.key).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search stories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookHeart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          No impact stories here yet
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((story: any) => {
            const status = story.status || "draft";
            return (
              <Card key={story.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {story.photo_urls?.[0] ? (
                  <div className="h-40 bg-muted overflow-hidden">
                    <img src={story.photo_urls[0]} alt={story.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-32 bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-2">{story.title}</h3>
                    <Badge variant={status === "published" ? "default" : "secondary"} className="text-[10px] shrink-0">{status}</Badge>
                  </div>
                  {beneficiaryName(story) && (
                    <p className="text-xs text-muted-foreground">About {beneficiaryName(story)}</p>
                  )}
                  {story.projects?.name && <p className="text-xs text-muted-foreground">{story.projects.name}</p>}
                  {story.story_text && <p className="text-xs text-muted-foreground line-clamp-3">{story.story_text}</p>}
                  {!story.consent_checked && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> No consent on file — shared without identifying details
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {story.tags?.map((tag: string) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {status === "draft" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => transition.mutate({ id: story.id, status: "submitted" })}>
                        <Send className="h-3 w-3 mr-1" /> Submit
                      </Button>
                    )}
                    {status === "submitted" && isAdmin && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => transition.mutate({ id: story.id, status: "approved" })}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    )}
                    {status === "approved" && isAdmin && (
                      <Button size="sm" className="h-7 text-xs"
                        onClick={() => transition.mutate({ id: story.id, status: "published" })}>
                        <Globe className="h-3 w-3 mr-1" /> Publish to donors
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(story.created_at).toLocaleDateString("en-KE")}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
