import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ClipboardList, Search, ArrowRight, AlertTriangle } from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBeneficiaryCases, useCreateCase, type CaseStatus, type CasePriority, type CaseType } from "@/hooks/useBeneficiaryCases";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBeneficiarySearch } from "@/hooks/useBeneficiarySearch";
import { useNavigate } from "react-router-dom";

const statusBadge: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  referred: "bg-purple-100 text-purple-700",
  resolved: "bg-teal-100 text-teal-700",
  closed: "bg-muted text-muted-foreground",
  lost_to_follow_up: "bg-rose-100 text-rose-700",
};
const priorityBadge: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const CASE_TYPES: CaseType[] = ["general_support","protection","health","education","livelihoods","emergency","referral","follow_up","other"];

export default function CaseManagement() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CaseStatus | "all">("all");
  const [priority, setPriority] = useState<CasePriority | "all">("all");
  const [caseType, setCaseType] = useState<CaseType | "all">("all");
  const [openSheet, setOpenSheet] = useState(false);

  const { data: cases, isLoading } = useBeneficiaryCases({ search, status, priority, caseType });

  return (
    <div className="space-y-6 p-6">
      <PageHeroHeader
        title="Case management"
        description="Track beneficiary support journeys, referrals and follow-ups"
        icon={ClipboardList}
        actions={<Button onClick={() => setOpenSheet(true)}><Plus className="h-4 w-4 mr-1" /> Open case</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search beneficiary, case #, summary…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(statusBadge).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {Object.keys(priorityBadge).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={caseType} onValueChange={(v) => setCaseType(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !cases || cases.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No cases found</h3>
          <p className="text-sm text-muted-foreground mb-4">Open a case to track support delivered to a beneficiary.</p>
          <Button onClick={() => setOpenSheet(true)}><Plus className="h-4 w-4 mr-1" /> Open case</Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y">
            {cases.map((c) => {
              const name = (c.beneficiary?.display_name ?? `${c.beneficiary?.first_name ?? ""} ${c.beneficiary?.last_name ?? ""}`.trim()) || "Unknown beneficiary";
              return (
                <Link key={c.id} to={`/cases/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{name}</span>
                      <span className="text-xs text-muted-foreground">{c.case_number}</span>
                      {c.priority === "critical" && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.summary ?? <em>No summary</em>} · opened {c.opened_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={priorityBadge[c.priority]}>{c.priority}</Badge>
                    <Badge className={statusBadge[c.case_status]}>{c.case_status.replace(/_/g," ")}</Badge>
                    <Badge variant="outline">{c.case_type.replace(/_/g," ")}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent></Card>
      )}

      <NewCaseSheet open={openSheet} onOpenChange={setOpenSheet} />
    </div>
  );
}

function NewCaseSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const createCase = useCreateCase();
  const { searchTerm, setSearchTerm, results, isLoading } = useBeneficiarySearch();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [caseType, setCaseType] = useState<CaseType>("general_support");
  const [priority, setPriority] = useState<CasePriority>("normal");
  const [summary, setSummary] = useState("");

  const handleSubmit = async () => {
    if (!selected) return;
    const created = await createCase.mutateAsync({
      beneficiary_id: selected.id,
      case_type: caseType,
      priority,
      summary: summary.trim() || null,
    });
    onOpenChange(false);
    setSelected(null); setSummary(""); setSearchTerm("");
    navigate(`/cases/${created.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>Open new case</SheetTitle></SheetHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Beneficiary *</Label>
            {selected ? (
              <div className="flex items-center justify-between rounded-md border p-2 mt-1">
                <span className="text-sm">{selected.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Change</Button>
              </div>
            ) : (
              <>
                <Input placeholder="Search beneficiary by name or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {isLoading && <p className="text-xs text-muted-foreground mt-1">Searching…</p>}
                {results.length > 0 && (
                  <div className="border rounded-md mt-1 max-h-48 overflow-auto">
                    {results.map((r) => {
                      const n = r.display_name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full text-left p-2 hover:bg-muted text-sm flex justify-between"
                          onClick={() => { setSelected({ id: r.id, name: n }); setSearchTerm(""); }}
                        >
                          <span>{n}</span>
                          <span className="text-xs text-muted-foreground">{r.unique_id ?? ""}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Case type</Label>
              <Select value={caseType} onValueChange={(v) => setCaseType(v as CaseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CasePriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["low","normal","high","critical"] as CasePriority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Briefly describe the support need or situation" />
          </div>
        </div>
        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selected || createCase.isPending}>Open case</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}