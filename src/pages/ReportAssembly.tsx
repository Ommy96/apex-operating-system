import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Sparkles, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useReportAssembly, type AssembledReport } from "@/hooks/useReportAssembly";
import { toast } from "@/hooks/use-toast";

function statusColor(s: string) {
  if (s === "on_track") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (s === "at_risk") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  if (s === "off_track") return "bg-red-100 text-red-700 hover:bg-red-100";
  return "bg-muted text-muted-foreground hover:bg-muted";
}

export default function ReportAssembly() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState(monthAgo);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [includeIndicators, setIncludeIndicators] = useState(true);
  const [includeNarratives, setIncludeNarratives] = useState(true);
  const [includeQuality, setIncludeQuality] = useState(true);
  const [report, setReport] = useState<AssembledReport | null>(null);

  const assemble = useReportAssembly();

  const onAssemble = async () => {
    try {
      const r = await assemble.mutateAsync({
        title: title || undefined,
        periodStart,
        periodEnd,
        includeIndicators,
        includeNarratives,
        includeQuality,
      });
      setReport(r);
    } catch (e: any) {
      toast({ title: "Failed to assemble report", description: e.message, variant: "destructive" });
    }
  };

  const onExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPrint = () => window.print();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <Button asChild variant="ghost" size="icon"><Link to="/me"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Report Assembly
          </h1>
          <p className="text-sm text-muted-foreground">Auto-assemble M&E reports from indicator data, narratives and quality flags.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card className="print:hidden">
          <CardHeader><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quarterly M&E Report" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">From</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">To</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={includeIndicators} onCheckedChange={(v) => setIncludeIndicators(!!v)} />
                Indicator performance
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={includeNarratives} onCheckedChange={(v) => setIncludeNarratives(!!v)} />
                Narrative reports
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={includeQuality} onCheckedChange={(v) => setIncludeQuality(!!v)} />
                Data quality summary
              </label>
            </div>
            <Button onClick={onAssemble} disabled={assemble.isPending} className="w-full">
              {assemble.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assembling…</> : <><Sparkles className="h-4 w-4 mr-2" />Assemble report</>}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!report ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                Configure the period and click <strong>Assemble report</strong> to generate.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="print:shadow-none">
                <CardHeader>
                  <div className="flex items-center justify-between print:block">
                    <div>
                      <CardTitle className="text-xl">{report.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.organization} • {report.period.start} → {report.period.end} • Generated {new Date(report.generatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                      <Button variant="outline" size="sm" onClick={onExport}><Download className="h-4 w-4 mr-1" /> JSON</Button>
                      <Button variant="outline" size="sm" onClick={onPrint}>Print</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {report.sections.map((s) => (
                    <div key={s.title}>
                      <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.content}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {includeIndicators && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Indicator performance ({report.indicators.length})</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-muted-foreground border-b">
                        <tr>
                          <th className="py-2">Indicator</th>
                          <th className="py-2">Current</th>
                          <th className="py-2">Target</th>
                          <th className="py-2">%</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.indicators.map((i) => (
                          <tr key={i.id} className="border-b">
                            <td className="py-2">{i.name}</td>
                            <td className="py-2 tabular-nums">{i.current ?? "—"}</td>
                            <td className="py-2 tabular-nums">{i.target ?? "—"}</td>
                            <td className="py-2 tabular-nums">{i.percent !== null ? `${i.percent.toFixed(0)}%` : "—"}</td>
                            <td className="py-2"><Badge className={statusColor(i.status)}>{i.status.replace("_", " ")}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {includeNarratives && report.narratives.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Narrative reports</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {report.narratives.map((n) => (
                      <div key={n.id} className="border-b pb-3 last:border-0">
                        <p className="font-medium text-sm">{n.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground mb-1">{new Date(n.created_at).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{n.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {includeQuality && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Data quality</CardTitle></CardHeader>
                  <CardContent className="flex gap-6 text-sm">
                    <div><span className="text-muted-foreground">Open flags:</span> <strong className="text-destructive">{report.dataQuality.open}</strong></div>
                    <div><span className="text-muted-foreground">Resolved flags:</span> <strong className="text-emerald-600">{report.dataQuality.resolved}</strong></div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}