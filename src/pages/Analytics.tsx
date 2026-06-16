import { useMemo, useRef, useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import { useAnalyticsUrlState } from "@/hooks/useAnalyticsUrlState";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import { useAnalyticsSavedViews } from "@/hooks/useAnalyticsSavedViews";
import { TABS, TAB_ORDER, TabKey, AnalyticsQuestion } from "@/lib/analyticsConfig";
import { QuestionBuilder } from "@/components/analytics/apex/QuestionBuilder";
import { AnswerArea } from "@/components/analytics/apex/AnswerArea";
import { SavedViewsPopover } from "@/components/analytics/apex/SavedViewsPopover";
import { ExportPopover } from "@/components/analytics/apex/ExportPopover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Analytics() {
  const { primaryColor } = useBranding();
  const accent = primaryColor || "hsl(var(--primary))";

  const { question, update, reset, setQuestion } = useAnalyticsUrlState();
  const { data, isLoading, isError, error } = useAnalyticsQuery(question);
  const { save } = useAnalyticsSavedViews();

  const exportRef = useRef<HTMLDivElement>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const exportRows = useMemo(
    () => (data?.series ?? []).map((s) => ({ [question.dimension]: s.label, [question.metric]: s.value })),
    [data, question.dimension, question.metric]
  );

  const handleSwitchTab = (tab: TabKey) => update({ tab });

  const handleToggleBreakdown = (dim: string) => {
    const exists = question.breakdowns.includes(dim);
    const next = exists
      ? question.breakdowns.filter((b) => b !== dim)
      : [...question.breakdowns, dim].slice(0, 4);
    update({ breakdowns: next });
  };

  const onSave = () => { setSaveName(""); setSaveOpen(true); };
  const confirmSave = () => {
    if (!saveName.trim()) return;
    save.mutate(
      { name: saveName.trim(), question },
      {
        onSuccess: () => { toast.success("View saved"); setSaveOpen(false); },
        onError: (e: any) => toast.error(e?.message ?? "Could not save view"),
      }
    );
  };

  const errMsg = (data?.error || (error as Error | undefined)?.message) ?? undefined;
  const realError = isError || !!data?.error;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Intelligence · Analytics
            </div>
            <h1 className="mt-1 text-[22px] font-medium tracking-tight text-foreground" style={{ fontFamily: "DM Sans, system-ui" }}>
              Analytics
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Explore your data across every dimension</p>
          </div>
          <div className="flex items-center gap-2">
            <SavedViewsPopover onLoad={(q) => setQuestion(q)} />
            <ExportPopover targetRef={exportRef} rows={exportRows} baseName={`analytics-${question.tab}-${question.metric}`} />
          </div>
        </header>

        {/* Tab bar */}
        <div className="mt-6 border-b border-border">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TAB_ORDER.map((tab) => {
              const active = question.tab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleSwitchTab(tab)}
                  className={cn(
                    "relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {TABS[tab].label}
                  {active && (
                    <span
                      className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question builder */}
        <div className="mt-6">
          <QuestionBuilder
            question={question}
            onChange={update}
            onReset={reset}
            onSave={onSave}
          />
        </div>

        {/* Answer */}
        <div ref={exportRef} className="mt-6">
          <AnswerArea
            question={question}
            result={data}
            isLoading={isLoading}
            isError={realError}
            errorMessage={errMsg}
            accent={accent}
            onDrillDown={(dimension, value) => update({ drillDown: { dimension, value } })}
            onApplySuggestion={(patch) => update(patch)}
            onToggleBreakdown={handleToggleBreakdown}
          />
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">View name</label>
            <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g. Beneficiary growth, last 12 months" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={confirmSave} disabled={!saveName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}