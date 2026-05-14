import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Target, History, Tag, Layers, ShieldAlert, Edit3, Save, X, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayDate } from "@/lib/dateUtils";
import { useIndicatorVersions, useUpdateIndicatorWithVersioning } from "@/hooks/useIndicatorVersions";
import { useIndicatorTargets, useIndicatorValues } from "@/hooks/useIndicators";
import { DisaggregationPanel } from "@/components/indicators/DisaggregationPanel";
import { useDataQualityFlags } from "@/hooks/useDataQuality";

function useIndicator(id?: string) {
  return useQuery({
    queryKey: ["indicator", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("indicators")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export default function IndicatorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: indicator, isLoading } = useIndicator(id);
  const { data: versions = [] } = useIndicatorVersions(id);
  const { data: targets = [] } = useIndicatorTargets(id);
  const { data: values = [] } = useIndicatorValues(id);
  const updateMut = useUpdateIndicatorWithVersioning();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [pendingReason, setPendingReason] = useState("");
  const [reasonOpen, setReasonOpen] = useState(false);

  const hasValues = values.length > 0;
  const isPublished = indicator?.publish_status === "published";

  const onEdit = () => {
    setForm({
      name: indicator?.name ?? "",
      description: indicator?.description ?? "",
      decision_context: indicator?.decision_context ?? "",
      calculation_method: indicator?.calculation_method ?? "",
      data_source_description: indicator?.data_source_description ?? "",
      baseline_value: indicator?.baseline_value ?? "",
      target_value: indicator?.target_value ?? "",
      unit: indicator?.unit ?? "",
    });
    setEditing(true);
  };

  const onSave = async () => {
    if (!id) return;
    if (isPublished && hasValues) {
      setReasonOpen(true);
      return;
    }
    await updateMut.mutateAsync({ id, updates: form });
    setEditing(false);
  };

  const onConfirmVersioned = async () => {
    if (!id) return;
    if (!pendingReason.trim()) return;
    await updateMut.mutateAsync({ id, updates: form, changeReason: pendingReason });
    setReasonOpen(false);
    setPendingReason("");
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Indicator not found.</p>
        <Button variant="link" onClick={() => navigate("/indicators")}>Back to indicators</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/indicators"><ArrowLeft className="h-4 w-4 mr-1" /> Indicators</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {indicator.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>Code: {indicator.code ?? "—"}</span>
              <span>•</span>
              <span>v{indicator.version ?? 1}</span>
              {indicator.level && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="capitalize">{indicator.level}</Badge>
                </>
              )}
              <Badge
                variant={isPublished ? "default" : indicator.publish_status === "retired" ? "secondary" : "outline"}
                className="capitalize"
              >
                {indicator.publish_status ?? "draft"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button onClick={onEdit}><Edit3 className="h-4 w-4 mr-1" /> Edit</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button onClick={onSave} disabled={updateMut.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Tag className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="definition"><Layers className="h-4 w-4 mr-1" /> Definition</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="disaggregation"><PieChart className="h-4 w-4 mr-1" /> Disaggregation</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> History</TabsTrigger>
          <TabsTrigger value="quality"><ShieldAlert className="h-4 w-4 mr-1" /> Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Decision context</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {editing ? (
                <Textarea
                  value={form.decision_context ?? ""}
                  onChange={(e) => setForm({ ...form, decision_context: e.target.value })}
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {indicator.decision_context || "No decision context recorded."}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground">Baseline</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold tabular-nums">
                {indicator.baseline_value ?? "—"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground">Target</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold tabular-nums">
                {indicator.target_value ?? "—"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground">Unit</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold">{indicator.unit ?? "—"}</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="definition" className="space-y-4 mt-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Name</Label>
                {editing ? (
                  <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                ) : (
                  <p className="text-sm">{indicator.name}</p>
                )}
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Description</Label>
                {editing ? (
                  <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{indicator.description || "—"}</p>
                )}
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Calculation method</Label>
                {editing ? (
                  <Textarea value={form.calculation_method ?? ""} onChange={(e) => setForm({ ...form, calculation_method: e.target.value })} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{indicator.calculation_method || "—"}</p>
                )}
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Data source</Label>
                {editing ? (
                  <Textarea value={form.data_source_description ?? ""} onChange={(e) => setForm({ ...form, data_source_description: e.target.value })} rows={2} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{indicator.data_source_description || "—"}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Baseline</Label>
                  {editing ? (
                    <Input type="number" value={form.baseline_value ?? ""} onChange={(e) => setForm({ ...form, baseline_value: e.target.value === "" ? null : Number(e.target.value) })} />
                  ) : (
                    <p className="text-sm">{indicator.baseline_value ?? "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Target</Label>
                  {editing ? (
                    <Input type="number" value={form.target_value ?? ""} onChange={(e) => setForm({ ...form, target_value: e.target.value === "" ? null : Number(e.target.value) })} />
                  ) : (
                    <p className="text-sm">{indicator.target_value ?? "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {targets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No period targets defined.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2">Period</th>
                      <th className="py-2">Year</th>
                      <th className="py-2">Target</th>
                      <th className="py-2">Min / Stretch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 capitalize">{t.period_type}</td>
                        <td className="py-2">{t.period_year}</td>
                        <td className="py-2 tabular-nums">{t.target_value}</td>
                        <td className="py-2 tabular-nums text-muted-foreground">
                          {t.minimum_value ?? "—"} / {t.stretch_value ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {values.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2">Period</th>
                      <th className="py-2">Value</th>
                      <th className="py-2">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.slice(0, 50).map((v) => (
                      <tr key={v.id} className="border-b">
                        <td className="py-2">{formatDisplayDate(v.period_start)} – {formatDisplayDate(v.period_end)}</td>
                        <td className="py-2 tabular-nums">{v.actual_value}</td>
                        <td className="py-2 text-muted-foreground">{formatDisplayDate(v.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disaggregation" className="mt-4">
          <DisaggregationPanel indicatorId={id!} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No prior versions. Versions are recorded when a published indicator with data is edited.
                </p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div key={v.id} className="border rounded-md p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Version {v.version}</div>
                        <div className="text-xs text-muted-foreground">{formatDisplayDate(v.created_at)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{v.name}</div>
                      {v.change_reason && (
                        <p className="text-sm mt-2 whitespace-pre-wrap">{v.change_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <IndicatorQualityTab indicatorId={id!} />
        </TabsContent>
      </Tabs>

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new version?</DialogTitle>
            <DialogDescription>
              This indicator is published and has recorded data. Saving will archive the current
              definition as version {indicator.version ?? 1} and create version {(indicator.version ?? 1) + 1}.
              Please describe what is changing and why.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Updated calculation method to exclude duplicates as agreed with M&E lead."
            value={pendingReason}
            onChange={(e) => setPendingReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReasonOpen(false)}>Cancel</Button>
            <Button onClick={onConfirmVersioned} disabled={!pendingReason.trim() || updateMut.isPending}>
              Create new version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IndicatorQualityTab({ indicatorId }: { indicatorId: string }) {
  const { data: flags = [], isLoading } = useDataQualityFlags({ resolved: "all" });
  const related = flags.filter((f) => f.entity_type === "indicator_value" || f.entity_id === indicatorId);
  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading flags…</p>
        ) : related.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data quality flags raised for this indicator.</p>
        ) : (
          <div className="space-y-2">
            {related.slice(0, 20).map((f) => (
              <div key={f.id} className="border rounded-md p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={f.flag_severity === "error" ? "destructive" : "secondary"} className="capitalize">{f.flag_severity}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{f.flag_type}</span>
                  {f.is_resolved && <Badge className="text-xs bg-emerald-100 text-emerald-700">Resolved</Badge>}
                </div>
                <p className="mt-1">{f.flag_message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}