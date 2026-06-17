import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import {
  useProjectEligibilityRules,
  useUpsertEligibilityRule,
  useDeleteEligibilityRule,
  useRecomputeEligibility,
  type EligibilityRule,
  type EligibilityOperator,
} from "@/hooks/useEligibility";

const SOURCES = [
  { value: "beneficiary.age", label: "Age (years)", hint: "Numeric — e.g., < 18" },
  { value: "beneficiary.gender", label: "Gender", hint: 'String — e.g., = "female"' },
  { value: "beneficiary.household_size", label: "Household size", hint: "Numeric — e.g., >= 4" },
  { value: "beneficiary.household_income", label: "Household income", hint: "Numeric — e.g., < 30000" },
  { value: "beneficiary.is_in_school", label: "Currently in school", hint: "Boolean — = true" },
  { value: "beneficiary.is_ovc", label: "Orphan / vulnerable child", hint: "Boolean — = true" },
  { value: "beneficiary.has_chronic_illness", label: "Has chronic illness", hint: "Boolean — = true" },
  { value: "beneficiary.employment_status", label: "Employment status", hint: 'String — = "unemployed"' },
  { value: "beneficiary.country", label: "Country", hint: 'in ["KE","UG"]' },
  { value: "beneficiary.county", label: "County / region", hint: 'String' },
  { value: "baseline.attendance_rate", label: "Baseline: attendance rate", hint: "Numeric 0-100" },
  { value: "baseline.academic_average", label: "Baseline: academic average", hint: "Numeric 0-100" },
  { value: "baseline.monthly_income", label: "Baseline: monthly income", hint: "Numeric" },
];

const OPERATORS: { value: EligibilityOperator; label: string }[] = [
  { value: "<", label: "less than (<)" },
  { value: "<=", label: "≤" },
  { value: "=", label: "equals (=)" },
  { value: ">=", label: "≥" },
  { value: ">", label: "greater than (>)" },
  { value: "between", label: "between [a,b]" },
  { value: "in", label: "in [list]" },
  { value: "not_in", label: "not in [list]" },
  { value: "is_null", label: "is empty" },
  { value: "not_null", label: "is set" },
];

export default function ProjectEligibility() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const sb = supabase as any;

  const { data: project } = useQuery({
    enabled: !!projectId,
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await sb.from("projects").select("id,name").eq("id", projectId).maybeSingle();
      return data;
    },
  });

  const { data: rules = [], isLoading } = useProjectEligibilityRules(projectId);
  const upsert = useUpsertEligibilityRule(projectId);
  const del = useDeleteEligibilityRule(projectId);
  const recompute = useRecomputeEligibility();

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ShieldCheck className="h-5 w-5" /> Eligibility rules
            </h1>
            {project && <p className="text-sm text-muted-foreground">{(project as any).name}</p>}
          </div>
        </div>
        <Button
          variant="outline"
          disabled={recompute.isPending}
          onClick={() => recompute.mutate({ mode: "project", projectId })}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute scores
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Rules with <Badge variant="outline">required</Badge> must all be met for a beneficiary to be eligible. Other rules contribute points to a vulnerability score.</p>
          <p>Each beneficiary is auto-scored against this project on profile updates and on demand.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              {rules.map((r) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  onSave={(patch) => upsert.mutate({ ...patch, id: r.id })}
                  onDelete={() => del.mutate(r.id)}
                />
              ))}
              <RuleRow
                isNew
                onSave={(patch) => upsert.mutate(patch)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RuleRow({
  rule,
  isNew,
  onSave,
  onDelete,
}: {
  rule?: EligibilityRule;
  isNew?: boolean;
  onSave: (patch: Partial<EligibilityRule>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [source, setSource] = useState(rule?.source ?? "beneficiary.age");
  const [operator, setOperator] = useState<EligibilityOperator>(rule?.operator ?? "<");
  const [valueText, setValueText] = useState(() =>
    rule?.value === undefined || rule?.value === null ? "" : typeof rule.value === "string" ? rule.value : JSON.stringify(rule.value),
  );
  const [points, setPoints] = useState(rule?.points_if_match ?? 10);
  const [required, setRequired] = useState(rule?.required ?? false);

  const sourceHint = useMemo(() => SOURCES.find((s) => s.value === source)?.hint, [source]);

  const parseValue = (): any => {
    if (operator === "is_null" || operator === "not_null") return null;
    const t = valueText.trim();
    if (!t) return null;
    try { return JSON.parse(t); } catch { return t; }
  };

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      source,
      operator,
      value: parseValue(),
      points_if_match: Number(points) || 0,
      required,
    });
    if (isNew) {
      setName(""); setValueText(""); setPoints(10); setRequired(false);
    }
  };

  return (
    <div className="grid gap-2 rounded-md border p-3 md:grid-cols-[1.4fr_1.4fr_0.9fr_1fr_0.6fr_0.7fr_auto] md:items-end">
      <div>
        {!rule && <Label className="text-xs">Name</Label>}
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
      </div>
      <div>
        {!rule && <Label className="text-xs">Source field</Label>}
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {sourceHint && <p className="mt-1 text-[11px] text-muted-foreground">{sourceHint}</p>}
      </div>
      <div>
        {!rule && <Label className="text-xs">Operator</Label>}
        <Select value={operator} onValueChange={(v) => setOperator(v as EligibilityOperator)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        {!rule && <Label className="text-xs">Value</Label>}
        <Input
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          placeholder={operator === "between" || operator === "in" || operator === "not_in" ? "[1,5]" : "value"}
          disabled={operator === "is_null" || operator === "not_null"}
        />
      </div>
      <div>
        {!rule && <Label className="text-xs">Points</Label>}
        <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={required} onCheckedChange={setRequired} />
        <span className="text-xs">Required</span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={submit}>
          {isNew ? <Plus className="h-4 w-4" /> : "Save"}
        </Button>
        {!isNew && onDelete && (
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}