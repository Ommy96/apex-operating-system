import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Plus, Calendar, HandCoins, Search } from "lucide-react";
import { format } from "date-fns";
import { NewActivitySheet } from "@/components/activities/NewActivitySheet";

const STATUS_CLS: Record<string, string> = {
  planned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function Activities() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState(params.get("project") || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-for-activities", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!).is("deleted_at", null).order("name");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", orgId, projectFilter, statusFilter, typeFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("activities")
        .select("id, name, type, status, scheduled_at, location, facilitator_name, project_id, projects(name)")
        .eq("organization_id", orgId!)
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    if (!search) return activities;
    const s = search.toLowerCase();
    return (activities as any[]).filter((a) => a.name?.toLowerCase().includes(s));
  }, [activities, search]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeroHeader
        title="Activities"
        description="Scheduled events and resource disbursements across projects"
        icon={Activity}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New activity
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search activities…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="disbursement">Disbursement</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No activities match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Activity</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Project</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Scheduled</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Facilitator</th>
                  </tr>
                </thead>
                <tbody>
                  {(filtered as any[]).map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/activities/${a.id}`)}
                      className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          {a.type === "disbursement"
                            ? <><HandCoins className="h-3.5 w-3.5 text-amber-600" /> Disbursement</>
                            : <><Calendar className="h-3.5 w-3.5 text-blue-600" /> Event</>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.projects?.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {a.scheduled_at ? format(new Date(a.scheduled_at), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`text-[10px] capitalize ${STATUS_CLS[a.status] || ""}`}>
                          {a.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.facilitator_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewActivitySheet open={open} onOpenChange={setOpen} orgId={orgId} />
    </div>
  );
}