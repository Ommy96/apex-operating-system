import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GanttChart } from "@/components/projects/GanttChart";
import { ChartGantt, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AllWorkplans() {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const orgId = currentOrganization?.organization_id;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["all-workplans-projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, programs(name)")
        .eq("organization_id", orgId!)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const projectIds = useMemo(() => projects.map((p: any) => p.id), [projects]);

  const { data: activitiesByProject = {} } = useQuery({
    queryKey: ["all-workplans-activities", orgId, projectIds.join(",")],
    queryFn: async () => {
      if (projectIds.length === 0) return {};
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, project_id, planned_start_date, planned_end_date, status, completion_percentage")
        .in("project_id", projectIds)
        .is("deleted_at", null);
      if (error) throw error;
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((a: any) => {
        if (!grouped[a.project_id]) grouped[a.project_id] = [];
        grouped[a.project_id].push(a);
      });
      return grouped;
    },
    enabled: projectIds.length > 0,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ChartGantt className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">All workplans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Merged Gantt across active projects</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-muted-foreground">
            <ChartGantt className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No active projects to display.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((p: any) => {
            const acts = activitiesByProject[p.id] || [];
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.programs?.name || "Standalone"} · {acts.length} {acts.length === 1 ? "activity" : "activities"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/dashboard/${p.id}`)} className="gap-1">
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {acts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No scheduled activities yet.</p>
                  ) : (
                    <GanttChart activities={acts as any} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}