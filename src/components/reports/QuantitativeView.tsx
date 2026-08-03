import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { QuantitativeReport } from "@/lib/reportAggregation";

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(Math.round(n));
}

export function QuantitativeView({ data }: { data: QuantitativeReport }) {
  const t = data.totals;
  const b = data.beneficiaries;
  const indicators = Object.entries(data.indicators);

  const stat = (label: string, value: string | number) => (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Activity totals</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {stat("Visits", formatNumber(t.visits))}
          {stat("Observations", formatNumber(t.observations))}
          {stat("Activities completed", formatNumber(t.activities_completed))}
          {stat("New enrollments", formatNumber(t.new_enrollments))}
          {stat("Exits", formatNumber(t.exits))}
          {stat("Disbursed", formatNumber(t.disbursements_value_base))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Beneficiaries</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stat("Active", formatNumber(b.active))}
          {stat("Newly enrolled", formatNumber(b.newly_enrolled))}
          {stat("Exited", formatNumber(b.exited))}
          {stat("High risk", formatNumber(b.high_risk))}
        </div>
      </section>

      {indicators.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Indicators</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {indicators.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{v.label || k}</div>
                    {v.unit && <div className="text-xs text-muted-foreground">{v.unit}</div>}
                  </div>
                  <div className="text-right font-mono text-sm tabular-nums">
                    {typeof v.normalized === "number" && <div>{v.normalized.toFixed(1)}%</div>}
                    {typeof v.raw === "number" && <div className="text-muted-foreground">raw: {v.raw}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.highlights.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Field highlights</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.highlights.map((h) => (
                <li key={h.id} className="flex gap-3 rounded-md border p-3">
                  {h.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.photo_url} alt="" className="h-16 w-16 flex-none rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{h.category}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(h.date), "PP")}</span>
                    </div>
                    <div className="mt-1 truncate font-medium">{h.title}</div>
                    {h.snippet && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.snippet}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}