import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  useDataQualityFlags,
  useDataQualitySummary,
  useResolveFlag,
  type DataQualityFlag,
} from "@/hooks/useDataQuality";
import { formatDisplayDate } from "@/lib/dateUtils";

function severityIcon(s: string) {
  if (s === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <Info className="h-4 w-4 text-info" />;
}

export default function DataQualityDashboard() {
  const [severity, setSeverity] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [resolved, setResolved] = useState<"all" | "open" | "resolved">("open");
  const { data: flags = [], isLoading } = useDataQualityFlags({ severity, entityType, resolved });
  const { summary } = useDataQualitySummary();
  const resolveMut = useResolveFlag();

  const [openFlag, setOpenFlag] = useState<DataQualityFlag | null>(null);
  const [note, setNote] = useState("");

  const onResolve = async () => {
    if (!openFlag || !note.trim()) {
      toast({ title: "Please provide a justification", variant: "destructive" });
      return;
    }
    await resolveMut.mutateAsync({ id: openFlag.id, note });
    toast({ title: "Flag resolved" });
    setOpenFlag(null);
    setNote("");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/me"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Data Quality
          </h1>
          <p className="text-sm text-muted-foreground">Monitor and resolve data quality flags across the organisation.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Total flags</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Open</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-destructive">{summary.open}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Resolved</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-success">{summary.resolved}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Errors</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.bySeverity.error}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Warnings</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.bySeverity.warning}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Flags</CardTitle>
            <div className="flex gap-2">
              <Select value={resolved} onValueChange={(v: any) => setResolved(v)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Entity type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  <SelectItem value="indicator_value">Indicator value</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="beneficiary">Beneficiary</SelectItem>
                  <SelectItem value="form_submission">Form submission</SelectItem>
                  <SelectItem value="case_entry">Case entry</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : flags.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-2" />
              No flags match the current filters.
            </div>
          ) : (
            <div className="divide-y">
              {flags.map((f) => (
                <div key={f.id} className="py-3 flex items-start gap-3">
                  <div className="mt-0.5">{severityIcon(f.flag_severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{f.entity_type.replace(/_/g, " ")}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{f.flag_type}</Badge>
                      {f.is_resolved && <Badge className="text-xs bg-success/10 text-success hover:bg-success/10">Resolved</Badge>}
                    </div>
                    <p className="text-sm mt-1">{f.flag_message ?? "No message"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Flagged {formatDisplayDate(f.created_at)}
                      {f.is_resolved && f.resolved_at && ` • Resolved ${formatDisplayDate(f.resolved_at)}`}
                    </p>
                    {f.resolution_note && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{f.resolution_note}"</p>
                    )}
                  </div>
                  {!f.is_resolved && (
                    <Button size="sm" variant="outline" onClick={() => setOpenFlag(f)}>Resolve</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openFlag} onOpenChange={(o) => { if (!o) { setOpenFlag(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve flag</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{openFlag?.flag_message}</p>
          <Textarea
            placeholder="Justification (required) — describe how the issue was addressed."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenFlag(null)}>Cancel</Button>
            <Button onClick={onResolve} disabled={!note.trim() || resolveMut.isPending}>Resolve flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}