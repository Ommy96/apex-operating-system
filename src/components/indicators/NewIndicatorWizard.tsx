import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Purpose", "Definition", "Targets", "Measurement", "Review"] as const;

const DISAGG_OPTIONS = [
  { value: "sex", label: "Sex" },
  { value: "age_group", label: "Age group" },
  { value: "location_county", label: "Location (county)" },
  { value: "disability_status", label: "Disability status" },
  { value: "family_status", label: "Family status" },
  { value: "vulnerability_level", label: "Vulnerability level" },
  { value: "programme", label: "Programme" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewIndicatorWizard({ open, onOpenChange }: Props) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [decisionContext, setDecisionContext] = useState("");
  const [level, setLevel] = useState<string>("output");
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [definition, setDefinition] = useState("");
  const [unit, setUnit] = useState("Number");
  const [calculationMethod, setCalculationMethod] = useState("");
  const [dataSource, setDataSource] = useState("Field survey");
  const [disagg, setDisagg] = useState<string[]>(["sex", "age_group", "location_county"]);
  const [baselineValue, setBaselineValue] = useState("");
  const [baselineDate, setBaselineDate] = useState("");
  const [baselineSource, setBaselineSource] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [reportingFrequency, setReportingFrequency] = useState("quarterly");
  const [collectionMethod, setCollectionMethod] = useState("Field survey");
  const [validationMin, setValidationMin] = useState("");
  const [validationMax, setValidationMax] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setStep(0);
    setName(""); setDecisionContext(""); setLevel("output"); setProgramIds([]);
    setDefinition(""); setUnit("Number"); setCalculationMethod(""); setDataSource("Field survey");
    setDisagg(["sex", "age_group", "location_county"]);
    setBaselineValue(""); setBaselineDate(""); setBaselineSource("");
    setTargetValue(""); setTargetDate(""); setReportingFrequency("quarterly"); setCollectionMethod("Field survey");
    setValidationMin(""); setValidationMax("");
    setErrors({});
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!name.trim()) e.name = "Indicator name is required.";
      if (!decisionContext.trim()) e.decisionContext = "Every indicator must map to a decision. Who will use this data, and what will they decide based on it?";
    } else if (step === 1) {
      if (!definition.trim()) e.definition = "Definition is required.";
      if (!unit.trim()) e.unit = "Unit is required.";
      if (!calculationMethod.trim()) e.calculationMethod = "Calculation method is required.";
    } else if (step === 2) {
      if (!targetValue.trim()) e.targetValue = "Target value is required.";
      if (!targetDate) e.targetDate = "Target date is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const handleSave = async (publish: boolean) => {
    if (!validateStep()) return;
    if (!currentOrganization?.organization_id) return;
    setSaving(true);
    try {
      const validationRule = (validationMin || validationMax)
        ? { min: validationMin ? Number(validationMin) : null, max: validationMax ? Number(validationMax) : null }
        : null;

      const code = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 40) + "_" + Math.random().toString(36).slice(2, 6).toUpperCase();

      const { error } = await (supabase as any).from("indicators").insert({
        organization_id: currentOrganization.organization_id,
        name: name.trim(),
        code,
        description: definition.trim(),
        decision_context: decisionContext.trim(),
        level,
        unit: unit.trim(),
        calculation_method: calculationMethod.trim(),
        data_source_description: dataSource,
        collection_method: collectionMethod,
        disaggregation_dimensions: disagg,
        baseline_value: baselineValue ? Number(baselineValue) : null,
        baseline_date: baselineDate || null,
        baseline_source: baselineSource || null,
        target_value: targetValue ? Number(targetValue) : null,
        target_date: targetDate || null,
        reporting_frequency: reportingFrequency,
        validation_rule: validationRule,
        program_ids: programIds,
        publish_status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
        is_active: publish,
        formula_type: "count",
        formula_config: {},
        aggregation_period: reportingFrequency === "annual" ? "yearly" : reportingFrequency === "monthly" ? "monthly" : "quarterly",
      });
      if (error) throw error;
      toast({ title: publish ? "Indicator published" : "Indicator saved as draft" });
      queryClient.invalidateQueries({ queryKey: ["indicators"] });
      queryClient.invalidateQueries({ queryKey: ["me-hub"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed to save indicator", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New indicator</SheetTitle>
          <SheetDescription>{STEPS[step]} — step {step + 1} of {STEPS.length}</SheetDescription>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 my-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={cn(
                "h-1.5 rounded-full flex-1 transition-colors",
                i <= step ? "bg-primary" : "bg-muted"
              )} />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {step === 0 && (
            <>
              <h3 className="font-medium">What are you measuring and why?</h3>
              <div className="space-y-2">
                <Label>Indicator name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Percentage of enrolled girls who pass end-of-term exam" />
                <p className="text-xs text-muted-foreground">Use clear, specific language. Bad: "School performance". Good: "Percentage of enrolled girls who pass end-of-term exam".</p>
                {errors.name && <ErrorMsg msg={errors.name} />}
              </div>
              <div className="space-y-2">
                <Label>What decision does this indicator inform? *</Label>
                <Textarea
                  value={decisionContext}
                  onChange={(e) => setDecisionContext(e.target.value)}
                  placeholder="e.g. Programme manager decides whether to increase tutoring sessions. District officer decides resource allocation."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Every indicator must map to a decision. Who will use this data, and what will they decide based on it?</p>
                {errors.decisionContext && <ErrorMsg msg={errors.decisionContext} />}
              </div>
              <div className="space-y-2">
                <Label>Indicator level *</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="output">Output — what we did</SelectItem>
                    <SelectItem value="outcome">Outcome — what changed</SelectItem>
                    <SelectItem value="impact">Impact — long-term change</SelectItem>
                    <SelectItem value="process">Process — how we work</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="font-medium">Define exactly what this indicator measures</h3>
              <div className="space-y-2">
                <Label>Full definition *</Label>
                <Textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3} />
                <p className="text-xs text-muted-foreground">Write this so that two different field officers would collect the same data independently.</p>
                {errors.definition && <ErrorMsg msg={errors.definition} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Unit of measurement *</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Number","Percentage","Rate","Score","Yes/No","KES","Hours","Days"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.unit && <ErrorMsg msg={errors.unit} />}
                </div>
                <div className="space-y-2">
                  <Label>Data source *</Label>
                  <Select value={dataSource} onValueChange={setDataSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Field survey","Records review","Attendance register","Medical records","School records","Direct observation","Administrative data","Other"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Calculation method *</Label>
                <Textarea value={calculationMethod} onChange={(e) => setCalculationMethod(e.target.value)} rows={3} placeholder="e.g. Count of beneficiaries who attended ≥ 80% of sessions in the reference period, divided by total enrolled, × 100" />
                {errors.calculationMethod && <ErrorMsg msg={errors.calculationMethod} />}
              </div>
              <div className="space-y-2">
                <Label>Disaggregation dimensions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DISAGG_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={disagg.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          setDisagg(checked ? [...disagg, opt.value] : disagg.filter(d => d !== opt.value));
                        }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-medium">Set your targets and starting point</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Baseline value</Label>
                  <Input type="number" value={baselineValue} onChange={(e) => setBaselineValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Baseline date</Label>
                  <Input type="date" value={baselineDate} onChange={(e) => setBaselineDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Baseline source</Label>
                <Input value={baselineSource} onChange={(e) => setBaselineSource(e.target.value)} placeholder="Where did the baseline come from?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Target value *</Label>
                  <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
                  {errors.targetValue && <ErrorMsg msg={errors.targetValue} />}
                </div>
                <div className="space-y-2">
                  <Label>Target date *</Label>
                  <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                  {errors.targetDate && <ErrorMsg msg={errors.targetDate} />}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-medium">How and when will this be measured?</h3>
              <div className="space-y-2">
                <Label>Reporting frequency *</Label>
                <Select value={reportingFrequency} onValueChange={setReportingFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["weekly","monthly","quarterly","biannual","annual","event_based"].map(f => <SelectItem key={f} value={f}>{f.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Collection method *</Label>
                <Select value={collectionMethod} onValueChange={setCollectionMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Field survey","Records review","Focus group discussion","Key informant interview","Direct observation","Administrative data"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Validation rule (optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Min value" value={validationMin} onChange={(e) => setValidationMin(e.target.value)} />
                  <Input type="number" placeholder="Max value" value={validationMax} onChange={(e) => setValidationMax(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">Values outside this range will trigger a warning during data entry.</p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="font-medium">Review and save</h3>
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <ReviewRow label="Name" value={name} />
                <ReviewRow label="Decision" value={decisionContext} />
                <ReviewRow label="Level" value={level} />
                <ReviewRow label="Unit" value={unit} />
                <ReviewRow label="Calculation" value={calculationMethod} />
                <ReviewRow label="Baseline" value={baselineValue ? `${baselineValue}${baselineDate ? ` (${baselineDate})` : ""}` : "—"} />
                <ReviewRow label="Target" value={`${targetValue}${targetDate ? ` by ${targetDate}` : ""}`} />
                <ReviewRow label="Frequency" value={reportingFrequency} />
                <ReviewRow label="Disaggregation" value={disagg.join(", ")} />
              </div>
              <p className="text-xs text-muted-foreground">Drafts are visible only to M&E officers. Publishing makes the indicator available for data collection and dashboards.</p>
            </>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button variant="ghost" onClick={prev} disabled={step === 0 || saving}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>Save as draft</Button>
              <Button onClick={() => handleSave(true)} disabled={saving}><Check className="h-4 w-4 mr-1" /> Publish</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {msg}
    </p>
  );
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium break-words">{value || "—"}</span>
    </div>
  );
}