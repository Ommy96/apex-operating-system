import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileDown, Trash2, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";

interface Props {
  programId?: string;
  projectId?: string;
  orgId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  finalized: "bg-primary/10 text-primary",
  sent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function DonorReportPacks({ programId, projectId, orgId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    donor_name: "",
    period_start: "",
    period_end: "",
    narrative_executive_summary: "",
    narrative_challenges: "",
    narrative_next_steps: "",
    narrative_lessons: "",
  });

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ["donor-report-packs", programId, projectId, orgId],
    queryFn: async () => {
      let q = supabase
        .from("donor_report_packs")
        .select("*")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      else if (programId) q = q.eq("program_id", programId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const createPack = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.period_start || !form.period_end) {
        throw new Error("Title and reporting period are required");
      }
      // Snapshot metrics
      const snapshot: any = {};
      const filterCol = projectId ? "project_id" : "program_id";
      const filterId = projectId || programId;

      if (filterId) {
        // Beneficiaries reached
        const { data: bs } = await supabase
          .from("beneficiary_services")
          .select("beneficiary_id, beneficiary:beneficiaries(gender)")
          .eq(filterCol, filterId);
        const bens = bs || [];
        snapshot.beneficiaries_total = new Set(bens.map((b: any) => b.beneficiary_id)).size;
        snapshot.beneficiaries_male = bens.filter((b: any) => b.beneficiary?.gender === "Male").length;
        snapshot.beneficiaries_female = bens.filter((b: any) => b.beneficiary?.gender === "Female").length;

        // Activities
        const { count: actCompleted } = await supabase
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq(filterCol, filterId)
          .eq("status", "completed")
          .gte("actual_date", form.period_start)
          .lte("actual_date", form.period_end);
        const { count: actTotal } = await supabase
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq(filterCol, filterId)
          .gte("planned_start_date", form.period_start)
          .lte("planned_start_date", form.period_end);
        snapshot.activities_completed = actCompleted || 0;
        snapshot.activities_planned = actTotal || 0;

        // Financials
        const { data: txs } = await supabase
          .from("financial_transactions")
          .select("transaction_type, amount")
          .eq(filterCol, filterId)
          .gte("transaction_date", form.period_start)
          .lte("transaction_date", form.period_end);
        snapshot.income = (txs || []).filter((t: any) => t.transaction_type !== "expense").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        snapshot.expense = (txs || []).filter((t: any) => t.transaction_type === "expense").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      }

      const { error } = await supabase.from("donor_report_packs").insert({
        organization_id: orgId!,
        program_id: programId || null,
        project_id: projectId || null,
        title: form.title,
        donor_name: form.donor_name || null,
        period_start: form.period_start,
        period_end: form.period_end,
        status: "draft",
        narrative_executive_summary: form.narrative_executive_summary,
        narrative_challenges: form.narrative_challenges,
        narrative_next_steps: form.narrative_next_steps,
        narrative_lessons: form.narrative_lessons,
        snapshot_json: snapshot,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report pack created");
      qc.invalidateQueries({ queryKey: ["donor-report-packs"] });
      setOpenCreate(false);
      setForm({ title: "", donor_name: "", period_start: "", period_end: "", narrative_executive_summary: "", narrative_challenges: "", narrative_next_steps: "", narrative_lessons: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("donor_report_packs").update({ status, updated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["donor-report-packs"] });
    },
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("donor_report_packs").update({ deleted_at: new Date().toISOString(), updated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["donor-report-packs"] });
    },
  });

  const exportPdf = (pack: any) => {
    setGenerating(pack.id);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      let y = 18;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(pack.title, pageW / 2, y, { align: "center" });
      y += 7;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text(`Donor: ${pack.donor_name || "—"}`, pageW / 2, y, { align: "center" });
      y += 5;
      pdf.text(`Period: ${pack.period_start} to ${pack.period_end}`, pageW / 2, y, { align: "center" });
      y += 10;
      pdf.setTextColor(0);

      const section = (title: string, body: string) => {
        if (y > 260) { pdf.addPage(); y = 18; }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(title, 15, y);
        y += 6;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(body || "—", pageW - 30);
        lines.forEach((ln: string) => {
          if (y > 280) { pdf.addPage(); y = 18; }
          pdf.text(ln, 15, y);
          y += 5;
        });
        y += 4;
      };

      const snap = pack.snapshot_json || {};
      const metrics = [
        `Beneficiaries reached: ${snap.beneficiaries_total ?? "—"} (Male: ${snap.beneficiaries_male ?? 0}, Female: ${snap.beneficiaries_female ?? 0})`,
        `Activities completed: ${snap.activities_completed ?? 0} of ${snap.activities_planned ?? 0} planned`,
        `Income: KES ${(snap.income ?? 0).toLocaleString()}`,
        `Expenses: KES ${(snap.expense ?? 0).toLocaleString()}`,
      ].join("\n");

      section("1. Executive Summary", pack.narrative_executive_summary);
      section("2. Key Metrics", metrics);
      section("3. Challenges", pack.narrative_challenges);
      section("4. Lessons Learned", pack.narrative_lessons);
      section("5. Next Steps", pack.narrative_next_steps);

      const pages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Page ${i} of ${pages}`, pageW - 15, 290, { align: "right" });
        pdf.text("Generated by ApexOS — The Impact Operating System", 15, 290);
      }
      pdf.save(`${pack.title.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF generated");
    } catch (e: any) {
      toast.error("Export failed");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Donor Reporting Packs</h2>
          <p className="text-sm text-muted-foreground">Compile narrative + metrics + financials into a single donor-ready report.</p>
        </div>
        <Sheet open={openCreate} onOpenChange={setOpenCreate}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Report Pack</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader><SheetTitle>Create Donor Report Pack</SheetTitle></SheetHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Q1 2026 Donor Progress Report" />
              </div>
              <div>
                <Label>Donor Name</Label>
                <Input value={form.donor_name} onChange={e => setForm({ ...form, donor_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Period Start *</Label>
                  <Input type="date" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} />
                </div>
                <div>
                  <Label>Period End *</Label>
                  <Input type="date" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Executive Summary</Label>
                <Textarea rows={3} value={form.narrative_executive_summary} onChange={e => setForm({ ...form, narrative_executive_summary: e.target.value })} />
              </div>
              <div>
                <Label>Challenges</Label>
                <Textarea rows={3} value={form.narrative_challenges} onChange={e => setForm({ ...form, narrative_challenges: e.target.value })} />
              </div>
              <div>
                <Label>Lessons Learned</Label>
                <Textarea rows={3} value={form.narrative_lessons} onChange={e => setForm({ ...form, narrative_lessons: e.target.value })} />
              </div>
              <div>
                <Label>Next Steps</Label>
                <Textarea rows={3} value={form.narrative_next_steps} onChange={e => setForm({ ...form, narrative_next_steps: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => createPack.mutate()} disabled={createPack.isPending}>
                {createPack.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Compile Report Pack
              </Button>
              <p className="text-xs text-muted-foreground">Metrics (beneficiaries, activities, financials) are automatically captured for the selected period.</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : packs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No donor report packs yet. Create one to compile a snapshot for the period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {packs.map((pack: any) => {
            const snap = pack.snapshot_json || {};
            return (
              <Card key={pack.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">{pack.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pack.donor_name ? `${pack.donor_name} · ` : ""}
                        {format(new Date(pack.period_start), "MMM d, yyyy")} → {format(new Date(pack.period_end), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[pack.status] || ""}>{pack.status}</Badge>
                      <Select value={pack.status} onValueChange={v => updateStatus.mutate({ id: pack.id, status: v })}>
                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="finalized">Finalized</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Beneficiaries</p><p className="font-semibold">{snap.beneficiaries_total ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Activities</p><p className="font-semibold">{snap.activities_completed ?? 0}/{snap.activities_planned ?? 0}</p></div>
                    <div><p className="text-xs text-muted-foreground">Income</p><p className="font-semibold">KES {Number(snap.income ?? 0).toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Expenses</p><p className="font-semibold">KES {Number(snap.expense ?? 0).toLocaleString()}</p></div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => exportPdf(pack)} disabled={generating === pack.id}>
                      {generating === pack.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                      Export PDF
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this pack?")) softDelete.mutate(pack.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}