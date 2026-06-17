import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Save, Zap } from "lucide-react";
import { toast } from "sonner";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { captureGPS } from "@/lib/offlineStorage";

type Project = { id: string; name: string };

const CATEGORIES = [
  { value: "visit", label: "Visit" },
  { value: "observation", label: "Observation" },
  { value: "milestone", label: "Milestone" },
  { value: "incident", label: "Incident" },
  { value: "photo", label: "Photo" },
  { value: "note", label: "Note" },
  { value: "attendance", label: "Attendance" },
];

/**
 * Lightweight, event-driven micro-log. Writes a single field_logs row
 * (queued offline if needed) so reports can pre-fill the numbers later.
 */
export function QuickFieldLog() {
  const { addRecord } = useOfflineSync();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [category, setCategory] = useState<string>("visit");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const sb = supabase as any;
      const { data } = await sb
        .from("projects")
        .select("id,name")
        .eq("organization_id", orgId)
        .order("name");
      setProjects((data as Project[]) || []);
    })();
  }, [orgId]);

  const captureLocation = async () => {
    try {
      const c = await captureGPS();
      setGps({ lat: c.latitude, lng: c.longitude });
      toast.success("Location captured");
    } catch {
      toast.error("Could not capture location");
    }
  };

  const canSave = useMemo(() => projectId && title.trim().length > 0, [projectId, title]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await addRecord("field_log", {
        project_id: projectId,
        category,
        title: title.trim(),
        body: body.trim() || null,
        gps_lat: gps?.lat ?? null,
        gps_lng: gps?.lng ?? null,
        logged_at: new Date().toISOString(),
      });
      toast.success("Logged");
      setTitle("");
      setBody("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" /> Quick field log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" />
        </div>
        <div>
          <Label>Details (optional)</Label>
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" type="button" onClick={captureLocation}>
            <MapPin className="mr-2 h-4 w-4" />
            {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "Add GPS"}
          </Button>
          <Button onClick={save} disabled={!canSave || saving}>
            <Save className="mr-2 h-4 w-4" /> Log it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}