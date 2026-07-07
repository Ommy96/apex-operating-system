import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FolderKanban, List } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/programs/ProjectForm";
import { useTierLabels } from "@/hooks/useTierLabels";
import { Plus } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  planned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  on_hold: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function AllProjects() {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const orgId = currentOrganization?.organization_id;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const view: "list" = "list";
  const [newOpen, setNewOpen] = useState(false);
  const T = useTierLabels();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["all-projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, start_date, end_date, program_id, programs(id, name)")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("status", { ascending: true })
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["all-projects-bens", orgId, projects.map(p => p.id).join(",")],
    queryFn: async () => {
      const result: Record<string, number> = {};
      await Promise.all(projects.map(async (p: any) => {
        const { count } = await supabase
          .from("beneficiary_services")
          .select("*", { count: "exact", head: true })
          .eq("project_id", p.id)
          .eq("status", "active")
          .is("deleted_at", null);
        result[p.id] = count || 0;
      }));
      return result;
    },
    enabled: !!orgId && projects.length > 0,
    staleTime: 60_000,
  });

  const programs = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p: any) => { if (p.programs) map.set(p.programs.id, p.programs.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  const filtered = projects.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (programFilter === "__none__") { if (p.program_id) return false; }
    else if (programFilter !== "all" && p.program_id !== programFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: any[] }>();
    const standalone: any[] = [];
    for (const p of filtered) {
      if (!p.program_id) { standalone.push(p); continue; }
      const key = p.program_id as string;
      if (!map.has(key)) map.set(key, { name: p.programs?.name || T.program, items: [] });
      map.get(key)!.items.push(p);
    }
    return { groups: Array.from(map.entries()).map(([id, v]) => ({ id, ...v })), standalone };
  }, [filtered, T.program]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">All {T.projectPluralLower}</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-{T.programLower} {T.projectLower} portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => navigate("/activities")}>
            <List className="h-4 w-4" /> {T.activityPlural}
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New {T.projectLower}
          </Button>
        </div>
      </div>

      {view === "list" && (
        <>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={T.program} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {T.programPluralLower}</SelectItem>
            <SelectItem value="__none__">Standalone (no {T.programLower})</SelectItem>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="on_hold">On hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No projects match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{T.project}</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{T.program}</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Start</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">End</th>
                    <th className="text-right px-4 py-3 font-medium">Beneficiaries</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.groups.map((g) => (
                    <>
                      <tr key={`h-${g.id}`} className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          {T.program} · {g.name}
                        </td>
                      </tr>
                      {g.items.map((p: any) => (
                        <tr key={p.id} onClick={() => navigate(`/projects/dashboard/${p.id}`)}
                          className="border-t hover:bg-muted/30 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.programs?.name || "—"}</td>
                          <td className="px-4 py-3"><Badge variant="secondary" className={STATUS_COLORS[p.status] || ""}>{p.status?.replace("_", " ") || "—"}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.start_date ? format(new Date(p.start_date), "MMM d, yyyy") : "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.end_date ? format(new Date(p.end_date), "MMM d, yyyy") : "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">{counts[p.id] ?? "—"}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                  {grouped.standalone.length > 0 && (
                    <>
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Standalone {T.projectPluralLower} · no {T.programLower}
                        </td>
                      </tr>
                      {grouped.standalone.map((p: any) => (
                        <tr key={p.id} onClick={() => navigate(`/projects/dashboard/${p.id}`)}
                          className="border-t hover:bg-muted/30 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell italic">Standalone</td>
                          <td className="px-4 py-3"><Badge variant="secondary" className={STATUS_COLORS[p.status] || ""}>{p.status?.replace("_", " ") || "—"}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.start_date ? format(new Date(p.start_date), "MMM d, yyyy") : "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.end_date ? format(new Date(p.end_date), "MMM d, yyyy") : "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">{counts[p.id] ?? "—"}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      <ProjectForm
        open={newOpen}
        onOpenChange={setNewOpen}
        programId={null}
        allowProgramSelection
        onSuccess={() => { setNewOpen(false); /* rely on realtime + query key */ }}
      />
    </div>
  );
}