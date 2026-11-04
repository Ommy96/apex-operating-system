import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  ClipboardList,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { QuickFieldLog } from "@/components/field/QuickFieldLog";

/**
 * Operational staff portal (/workspace). Field-scoped staff land here by
 * default. The beneficiaries query is automatically narrowed to assigned
 * projects by the database (beneficiaries RLS role scoping) — this page
 * never widens it client-side.
 */

type BeneficiaryRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  updated_at: string | null;
};

function displayName(b: BeneficiaryRow): string {
  return (
    b.display_name ||
    `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() ||
    "Beneficiary"
  );
}

const VISIT_TYPES = ["home_visit", "school_visit", "follow_up", "meeting"] as const;

export default function StaffWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const [search, setSearch] = useState("");
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitBeneficiaryId, setVisitBeneficiaryId] = useState("");
  const [visitType, setVisitType] = useState<string>("home_visit");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visitLocation, setVisitLocation] = useState("");
  const [visitNotes, setVisitNotes] = useState("");

  // Assigned beneficiaries — the database scopes this list to the user's
  // assignments (RLS). Created-by records are also visible.
  const { data: beneficiaries = [], isLoading: beneficiariesLoading } = useQuery({
    queryKey: ["staff-workspace-beneficiaries", orgId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("id, display_name, first_name, last_name, updated_at")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as BeneficiaryRow[];
    },
    enabled: !!orgId && !!user?.id,
  });

  // Visits the staff member recorded for today.
  const today = new Date().toISOString().slice(0, 10);
  const { data: visitsToday = [], isLoading: visitsLoading } = useQuery({
    queryKey: ["staff-workspace-visits-today", orgId, user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiary_visitations")
        .select("id, beneficiary_id, visit_type, location, visit_date")
        .eq("organization_id", orgId!)
        .eq("created_by", user!.id)
        .eq("visit_date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && !!user?.id,
  });

  // The staff member's latest field logs.
  const { data: fieldLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["staff-workspace-field-logs", orgId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_logs")
        .select("id, title, category, logged_at, beneficiary_id")
        .eq("organization_id", orgId!)
        .eq("logged_by", user!.id)
        .order("logged_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && !!user?.id,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return beneficiaries;
    return beneficiaries.filter((b) => displayName(b).toLowerCase().includes(q));
  }, [beneficiaries, search]);

  const beneficiaryName = (id: string) => {
    const found = beneficiaries.find((b) => b.id === id);
    return found ? displayName(found) : "Beneficiary";
  };

  const recordVisit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("beneficiary_visitations").insert({
        organization_id: orgId,
        beneficiary_id: visitBeneficiaryId,
        visit_type: visitType,
        visit_date: visitDate,
        location: visitLocation || null,
        reason_for_visit: visitNotes || null,
        staff_name:
          user?.user_metadata?.full_name || user?.email?.split("@")[0] || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Visit recorded" });
      setVisitOpen(false);
      setVisitBeneficiaryId("");
      setVisitLocation("");
      setVisitNotes("");
      queryClient.invalidateQueries({
        queryKey: ["staff-workspace-visits-today", orgId, user?.id],
      });
    },
    onError: (err: unknown) => {
      toast({
        title: "Could not record the visit",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Staff portal</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            My Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your assigned {beneficiaries.length === 1 ? "person" : "people"} and today's work
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/field-mode")}>
            Field Mode
          </Button>
          <Button onClick={() => setVisitOpen(true)} disabled={beneficiaries.length === 0}>
            <MapPin className="h-4 w-4 mr-2" /> Record visit
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assigned people */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Assigned {beneficiaries.length === 1 ? "person" : "people"}
            </CardTitle>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="max-w-[200px] h-8"
            />
          </CardHeader>
          <CardContent>
            {beneficiariesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assigned records. People assigned to your projects appear here.
              </p>
            ) : (
              <ul className="divide-y max-h-[420px] overflow-y-auto">
                {filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/beneficiaries/${b.id}`)}
                      className="w-full text-left py-2 flex items-center justify-between gap-3 hover:bg-muted/40 rounded-md px-1"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{displayName(b)}</p>
                        {b.updated_at && (
                          <p className="text-xs text-muted-foreground">
                            Updated {formatDistanceToNow(new Date(b.updated_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Today's visits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Visits recorded today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <Skeleton className="h-5 w-2/3" />
              ) : visitsToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits recorded today yet.</p>
              ) : (
                <ul className="space-y-1">
                  {visitsToday.map((v: any) => (
                    <li
                      key={v.id}
                      className="p-2 rounded-md border bg-card flex items-center justify-between gap-2"
                    >
                      <span className="text-sm truncate">{beneficiaryName(v.beneficiary_id)}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(v.visit_type || "visit").replace(/_/g, " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent field logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> My recent field logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <Skeleton className="h-5 w-2/3" />
              ) : fieldLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No field logs yet — use the quick log below.</p>
              ) : (
                <ul className="space-y-1">
                  {fieldLogs.map((f: any) => (
                    <li key={f.id} className="p-2 rounded-md border bg-card">
                      <p className="text-sm font-medium truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.category} · {formatDistanceToNow(new Date(f.logged_at), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick capture */}
      <div>
        <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Quick field log
          <span className="text-xs text-muted-foreground font-normal">
            (saved offline, syncs automatically)
          </span>
        </h2>
        <QuickFieldLog />
      </div>

      {/* Record visit dialog */}
      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record a visit</DialogTitle>
            <DialogDescription>
              The visit is saved to the selected person's record immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Person</Label>
              <Select value={visitBeneficiaryId} onValueChange={setVisitBeneficiaryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {filtered.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {displayName(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Visit type</Label>
                <Select value={visitType} onValueChange={setVisitType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={visitLocation}
                onChange={(e) => setVisitLocation(e.target.value)}
                placeholder="e.g. Home, school…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Purpose / notes</Label>
              <Textarea
                rows={3}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Why was this visit made?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordVisit.mutate()}
              disabled={!visitBeneficiaryId || recordVisit.isPending}
            >
              {recordVisit.isPending ? "Saving…" : "Save visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
