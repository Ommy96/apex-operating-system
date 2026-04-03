import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Search, BookHeart, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const THEMES = ["education", "health", "livelihoods", "WASH", "protection", "other"];

export default function ImpactStories() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", project_id: "", story_text: "", theme: "other", tags: "", status: "draft" });
  const [photos, setPhotos] = useState<File[]>([]);

  const { data: stories = [] } = useQuery({
    queryKey: ["impact-stories", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_stories")
        .select("*, projects(name)")
        .eq("org_id", orgId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-stories", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: async () => {
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const path = `${orgId}/${Date.now()}_${photo.name}`;
        const { error } = await supabase.storage.from("impact-stories").upload(path, photo);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("impact-stories").getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }
      const { error } = await supabase.from("impact_stories").insert({
        org_id: orgId!,
        title: form.title,
        project_id: form.project_id || null,
        story_text: form.story_text || null,
        theme: form.theme,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        status: form.status as 'draft' | 'published',
        published_at: form.status === "published" ? new Date().toISOString() : null,
        author_id: user?.id,
        photo_urls: photoUrls,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impact-stories"] });
      toast.success("Story saved");
      setCreateOpen(false);
      setForm({ title: "", project_id: "", story_text: "", theme: "other", tags: "", status: "draft" });
      setPhotos([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = stories.filter((s: any) => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impact Stories</h1>
          <p className="text-sm text-muted-foreground">Capture and share stories of change</p>
        </div>
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Story</Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader><SheetTitle>New Impact Story</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Project</Label>
                <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Link to project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
                <Input type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files || []).slice(0, 5))} />
                {photos.length > 0 && <p className="text-xs text-muted-foreground mt-1">{photos.length} photo(s) selected</p>}
              </div>
              <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">Save Story</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search stories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookHeart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          No impact stories yet
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((story: any) => (
            <Card key={story.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {story.photo_urls?.[0] && (
                <div className="h-40 bg-muted overflow-hidden">
                  <img src={story.photo_urls[0]} alt={story.title} className="w-full h-full object-cover" />
                </div>
              )}
              {!story.photo_urls?.[0] && (
                <div className="h-32 bg-muted/30 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground line-clamp-2">{story.title}</h3>
                  <Badge variant={story.status === "published" ? "default" : "secondary"} className="text-[10px] shrink-0">{story.status}</Badge>
                </div>
                {story.projects?.name && <p className="text-xs text-muted-foreground">{story.projects.name}</p>}
                {story.story_text && <p className="text-xs text-muted-foreground line-clamp-3">{story.story_text}</p>}
                <div className="flex flex-wrap gap-1">
                  {story.tags?.map((tag: string) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(story.created_at).toLocaleDateString("en-KE")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
