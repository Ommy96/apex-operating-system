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
import { Search, FolderKanban, List, GanttChart as GanttIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import AllWorkplans from "./AllWorkplans";

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
    if (programFilter !== "all" && p.program_id !== programFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">All projects</h1>
        <p className="text-sm text-muted-foreground mt-1">Cross-programme project portfolio</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Programme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programmes</SelectItem>
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
                    <th className="text-left px-4 py-3 font-medium">Project</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Programme</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Start</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">End</th>
                    <th className="text-right px-4 py-3 font-medium">Beneficiaries</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p: any) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/projects/dashboard/${p.id}`)}
                      className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.programs?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={STATUS_COLORS[p.status] || ""}>{p.status?.replace("_", " ") || "—"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.start_date ? format(new Date(p.start_date), "MMM d, yyyy") : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{p.end_date ? format(new Date(p.end_date), "MMM d, yyyy") : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{counts[p.id] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}