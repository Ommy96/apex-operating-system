import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, RotateCcw, Save } from "lucide-react";
import { AnalyticsQuestion, RANGES, TABS, dimensionKind } from "@/lib/analyticsConfig";
import { cn } from "@/lib/utils";

interface PillProps {
  label: string;
  value: string;
  options: Array<{ key: string; label: string }>;
  onChange: (key: string) => void;
}

function Pill({ label, value, options, onChange }: PillProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={label}
        >
          <span className="text-muted-foreground font-normal">{label}</span>
          <span className="ml-1">{selected?.label ?? "—"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="max-h-72 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
          ) : (
            options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => { onChange(o.key); setOpen(false); }}
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                  o.key === value && "bg-muted font-medium"
                )}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FilterPillProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  tab: AnalyticsQuestion["tab"];
}

function FilterPill({ filters, onChange, tab }: FilterPillProps) {
  const [open, setOpen] = useState(false);
  const tabCfg = TABS[tab];
  const active = Object.entries(filters).filter(([, v]) => !!v);
  const summary = active.length === 0 ? "All" : `${active.length} active`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <span className="text-muted-foreground font-normal">for</span>
          <span className="ml-1">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 space-y-3">
        {tabCfg.filters.length === 0 && (
          <p className="text-xs text-muted-foreground">No filters available for this tab.</p>
        )}
        {tabCfg.filters.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</label>
            <input
              type="text"
              value={filters[f.key] ?? ""}
              onChange={(e) => onChange({ ...filters, [f.key]: e.target.value })}
              placeholder="Any"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  question: AnalyticsQuestion;
  onChange: (patch: Partial<AnalyticsQuestion>) => void;
  onReset: () => void;
  onSave: () => void;
}

export function QuestionBuilder({ question, onChange, onReset, onSave }: Props) {
  const tabCfg = TABS[question.tab];
  const isTimeDim = dimensionKind(question.tab, question.dimension) === "time";
  const secondOptions = [
    { key: "__none", label: "Nothing" },
    ...tabCfg.dimensions
      .filter((d) => d.key !== question.dimension)
      .map((d) => ({ key: d.key, label: d.label })),
  ];
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Show me</span>
        <Pill
          label="metric"
          value={question.metric}
          options={tabCfg.metrics.map((m) => ({ key: m.key, label: m.label }))}
          onChange={(metric) => onChange({ metric })}
        />
        <span className="text-sm text-muted-foreground">by</span>
        <Pill
          label="dimension"
          value={question.dimension}
          options={tabCfg.dimensions.map((d) => ({ key: d.key, label: d.label }))}
          onChange={(dimension) => onChange({ dimension })}
        />
        <span className="text-sm text-muted-foreground">and</span>
        <Pill
          label="cross by"
          value={question.dimension2 ?? "__none"}
          options={secondOptions}
          onChange={(key) => onChange({ dimension2: key === "__none" ? undefined : key })}
        />
        <FilterPill
          tab={question.tab}
          filters={question.filters}
          onChange={(filters) => onChange({ filters })}
        />
        <span className="text-sm text-muted-foreground">over</span>
        <Pill
          label="time"
          value={question.range}
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          onChange={(range) => onChange({ range: range as AnalyticsQuestion["range"] })}
        />
        {isTimeDim && (
          <div className="inline-flex items-center rounded-full border border-border bg-background p-0.5">
            {(["cumulative", "new"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange({ mode: m })}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                  (question.mode ?? "cumulative") === m
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "cumulative" ? "Running total" : "New in period"}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-2 text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={onSave} className="h-8 px-2 text-xs">
            <Save className="h-3.5 w-3.5 mr-1" /> Save view
          </Button>
        </div>
      </div>
      {question.drillDown && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Drilled into</span>
          <span className="rounded-full bg-background border border-border px-2 py-0.5">
            {question.drillDown.dimension}: {question.drillDown.value}
          </span>
          <button
            type="button"
            onClick={() => onChange({ drillDown: undefined })}
            className="underline hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}