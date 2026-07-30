import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, HandCoins, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { NewActivitySheet } from "./NewActivitySheet";

const STATUS_CLS: Record<string, string> = {
  planned: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

interface Props {
  /** Pass projectId OR programId to filter; leave both blank for org-wide */
  projectId?: string;
  programId?: string;
  orgId?: string;
  /** When true, hide the "+ New activity" CTA (e.g. on programme page) */
  readOnly?: boolean;
}

export function ProjectActivitiesTab({ projectId, programId, orgId, readOnly }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["project-activities", projectId, programId, orgId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("activities")
        .select("id, name, type, status, scheduled_at, location, facilitator_name, project_id, program_id, projects(id, name)")
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      else if (programId) q = q.eq("program_id", programId);
      else if (orgId) q = q.eq("organization_id", orgId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(projectId || programId || orgId),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {!readOnly && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New activity
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No activities yet.
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((a: any) => (
              <button
                key={a.id}
                onClick={() => navigate(`/activities/${a.id}`)}
                className="w-full flex items-center gap-3 py-3 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {a.type === "disbursement"
                    ? <HandCoins className="h-4 w-4 text-warning" />
                    : <Calendar className="h-4 w-4 text-info" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.projects?.name || "—"}
                    {a.scheduled_at && ` · ${format(new Date(a.scheduled_at), "dd MMM yyyy")}`}
                    {a.facilitator_name && ` · ${a.facilitator_name}`}
                  </p>
                </div>
                <Badge variant="secondary" className={`text-[10px] capitalize ${STATUS_CLS[a.status] || ""}`}>
                  {a.status?.replace("_", " ")}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        {!readOnly && (
          <NewActivitySheet open={open} onOpenChange={setOpen} orgId={orgId} projectId={projectId} />
        )}
      </CardContent>
    </Card>
  );
}