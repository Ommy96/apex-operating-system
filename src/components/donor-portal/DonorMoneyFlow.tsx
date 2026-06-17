import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDonorPortal } from "@/hooks/useDonorPortal";
import { useDonorFx } from "@/hooks/useDonorFx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Node = { id: string; label: string; group: string };
type Link = { source: string; target: string; value: number };
type Flow = {
  nodes: Node[];
  links: Link[];
  totals: { allocated: number; currency: string; projects: { id: string; name: string; amount: number }[] };
};

function today() { return new Date().toISOString().slice(0, 10); }
function defaultFrom() {
  const d = new Date(); d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function DonorMoneyFlow() {
  const { donorAccount } = useDonorPortal();
  const fx = useDonorFx((donorAccount as any)?.preferred_currency);
  const [from, setFrom] = useState<string>(defaultFrom());
  const [to, setTo] = useState<string>(today());
  const [flow, setFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<Flow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("donor-money-flow", {
      body: { from: from || undefined, to: to || undefined },
    });
    if (!error && data) setFlow(data as Flow);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [donorAccount?.id]);

  const loadProject = async (projectId: string) => {
    setSelectedProject(projectId);
    setProjectDetail(null);
    const { data, error } = await supabase.functions.invoke("donor-money-flow", {
      body: { from: from || undefined, to: to || undefined, project_id: projectId },
    });
    if (!error && data) setProjectDetail(data as Flow);
  };

  const downloadPdf = () => {
    if (!flow) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Donor Statement", 14, 18);
      doc.setFontSize(10);
      doc.text(`${donorAccount?.donor_name || "Donor"}`, 14, 26);
      doc.text(`Period: ${from || "—"} to ${to || "—"}`, 14, 32);
      doc.text(
        `Preferred currency: ${(donorAccount as any)?.preferred_currency || "USD"}  ·  Base ledger currency: ${flow.totals.currency}`,
        14, 38
      );
      doc.text(
        "FX disclaimer: amounts shown in your preferred currency are converted at the most recent rate on file. The base-currency ledger is authoritative.",
        14, 46, { maxWidth: 180 }
      );

      autoTable(doc, {
        startY: 60,
        head: [["Project", `Base (${flow.totals.currency})`, `In ${fx.target}`]],
        body: flow.totals.projects.map((p) => [
          p.name,
          p.amount.toLocaleString(),
          fx.format(p.amount, flow.totals.currency),
        ]),
        foot: [[
          "Total allocated",
          flow.totals.allocated.toLocaleString(),
          fx.format(flow.totals.allocated, flow.totals.currency),
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 123, 108] },
        footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
      });

      doc.save(`donor-statement-${from || "start"}_${to || "today"}.pdf`);
      toast.success("Statement downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Could not generate PDF");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Where my money went</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>Apply</Button>
            <Button onClick={downloadPdf} disabled={!flow || flow.totals.allocated === 0} className="ml-auto">
              <Download className="h-4 w-4 mr-2" /> Download PDF statement
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : !flow || flow.totals.allocated === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No allocations recorded in this period.
            </p>
          ) : (
            <Sankey flow={flow} onProjectClick={loadProject} />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">By project</CardTitle>
        </CardHeader>
        <CardContent>
          {!flow ? null : (
            <ul className="divide-y">
              {flow.totals.projects.map((p) => (
                <li
                  key={p.id}
                  className={`py-2 flex items-center justify-between cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded ${
                    selectedProject === p.id ? "bg-muted/40" : ""
                  }`}
                  onClick={() => loadProject(p.id)}
                >
                  <span className="text-sm">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{fx.format(p.amount, flow.totals.currency)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedProject && projectDetail && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">
              Drilldown: {flow?.totals.projects.find((p) => p.id === selectedProject)?.name || "Project"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BeneficiaryAttribution flow={projectDetail} fx={fx} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Sankey({ flow, onProjectClick }: { flow: Flow; onProjectClick: (id: string) => void }) {
  const cols = ["donor", "pool", "project", "beneficiary"];
  const groups = useMemo(() => {
    const m: Record<string, Node[]> = { donor: [], pool: [], project: [], beneficiary: [] };
    flow.nodes.forEach((n) => { (m[n.group] || (m[n.group] = [])).push(n); });
    return m;
  }, [flow]);

  const W = 720, H = 360, padX = 16, padY = 12;
  const colW = (W - padX * 2) / cols.length;
  const sums = new Map<string, number>();
  flow.links.forEach((l) => {
    sums.set(l.source, (sums.get(l.source) ?? 0) + l.value);
    sums.set(l.target, (sums.get(l.target) ?? 0) + l.value);
  });
  const colMax = cols.map((c) => groups[c].reduce((s, n) => s + (sums.get(n.id) ?? 0), 0) || 1);

  const pos = new Map<string, { x: number; y: number; h: number }>();
  cols.forEach((c, i) => {
    let y = padY;
    const max = colMax[i];
    groups[c].forEach((n) => {
      const v = sums.get(n.id) ?? 0;
      const h = Math.max(8, ((H - padY * 2) * v) / max);
      pos.set(n.id, { x: padX + i * colW + 8, y, h });
      y += h + 4;
    });
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[360px] min-w-[640px]">
        {flow.links.map((l, idx) => {
          const s = pos.get(l.source); const t = pos.get(l.target);
          if (!s || !t) return null;
          const x1 = s.x + colW - 16;
          const x2 = t.x;
          const y1 = s.y + s.h / 2;
          const y2 = t.y + t.h / 2;
          const mid = (x1 + x2) / 2;
          const w = Math.max(1, Math.min(20, l.value / (flow.totals.allocated || 1) * 40));
          return (
            <path key={idx}
              d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
              stroke="hsl(var(--primary) / 0.35)" strokeWidth={w} fill="none" />
          );
        })}
        {flow.nodes.map((n) => {
          const p = pos.get(n.id); if (!p) return null;
          const isProj = n.group === "project";
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: isProj ? "pointer" : "default" }}
               onClick={() => isProj && onProjectClick(n.id.replace(/^proj:/, ""))}>
              <rect width={colW - 24} height={p.h} rx={4} fill="hsl(var(--primary))" opacity={0.85} />
              <text x={(colW - 24) / 2} y={Math.min(p.h - 4, 14)} fontSize={10} fill="white" textAnchor="middle">
                {n.label.slice(0, 22)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-muted-foreground mt-2">
        Donor → pools → projects → beneficiaries. Beneficiary names are anonymized unless you directly sponsor them with active media consent. Click a project node for drilldown.
      </p>
    </div>
  );
}

function BeneficiaryAttribution({ flow, fx }: { flow: Flow; fx: ReturnType<typeof useDonorFx> }) {
  const ben = flow.nodes.filter((n) => n.group === "beneficiary");
  const sums = new Map<string, number>();
  flow.links.forEach((l) => {
    const tgt = flow.nodes.find((n) => n.id === l.target);
    if (tgt?.group === "beneficiary") sums.set(l.target, (sums.get(l.target) ?? 0) + l.value);
  });
  if (ben.length === 0) return <p className="text-sm text-muted-foreground">No beneficiary-level attribution.</p>;
  return (
    <ul className="divide-y">
      {ben
        .map((b) => ({ b, v: sums.get(b.id) ?? 0 }))
        .sort((a, z) => z.v - a.v)
        .map(({ b, v }) => (
          <li key={b.id} className="py-2 flex items-center justify-between text-sm">
            <span>{b.label}</span>
            <span className="font-medium">{fx.format(v, flow.totals.currency)}</span>
          </li>
        ))}
    </ul>
  );
}