/**
 * Registry of metrics, dimensions, filters and time-ranges for the
 * ApexOS Analytics page. The edge function `analytics-query` dispatches
 * on `${tab}:${metric}:${dimension}` so keys here must match the
 * function's handler map exactly.
 */

export type TabKey =
  | "people"
  | "programmes"
  | "money"
  | "impact"
  | "operations"
  | "custom";

export type RangeKey =
  | "30d"
  | "90d"
  | "12mo"
  | "ytd"
  | "last-year"
  | "all";

export type DimensionKind = "time" | "categorical" | "geographic";

export interface DimensionDef {
  key: string;
  label: string;
  kind: DimensionKind;
}

export interface MetricDef {
  key: string;
  label: string;
  /** Caption sentence under the headline number. {metric} is interpolated. */
  caption?: string;
  /** Default dimension to pair with this metric. */
  defaultDimension: string;
  /** Whether higher values are "good" (drives delta colour). */
  goodDirection: "up" | "down" | "neutral";
}

export interface FilterDef {
  key: string;
  label: string;
}

export interface TabConfig {
  key: TabKey;
  label: string;
  metrics: MetricDef[];
  dimensions: DimensionDef[];
  filters: FilterDef[];
  /** Whether real queries are wired up (false → "Coming soon" empty state) */
  implemented: boolean;
}

export const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12mo", label: "Last 12 months" },
  { key: "ytd", label: "This year" },
  { key: "last-year", label: "Last year" },
  { key: "all", label: "All time" },
];

const peopleDimensions: DimensionDef[] = [
  { key: "month", label: "Month", kind: "time" },
  { key: "week", label: "Week", kind: "time" },
  { key: "day", label: "Day", kind: "time" },
  { key: "county", label: "County", kind: "geographic" },
  { key: "sub_county", label: "Sub-county", kind: "categorical" },
  { key: "gender", label: "Gender", kind: "categorical" },
  { key: "age_group", label: "Age group", kind: "categorical" },
  { key: "care_arrangement", label: "Care arrangement", kind: "categorical" },
  { key: "vulnerability", label: "Vulnerability level", kind: "categorical" },
  { key: "programme", label: "Programme", kind: "categorical" },
];

const programmeDimensions: DimensionDef[] = [
  { key: "month", label: "Month", kind: "time" },
  { key: "programme", label: "Programme", kind: "categorical" },
  { key: "project", label: "Project", kind: "categorical" },
  { key: "activity_type", label: "Activity type", kind: "categorical" },
];

const moneyDimensions: DimensionDef[] = [
  { key: "month", label: "Month", kind: "time" },
  { key: "donor", label: "Donor", kind: "categorical" },
  { key: "programme", label: "Programme", kind: "categorical" },
];

export const TABS: Record<TabKey, TabConfig> = {
  people: {
    key: "people",
    label: "People",
    implemented: true,
    dimensions: peopleDimensions,
    filters: [
      { key: "programme", label: "Programme" },
      { key: "county", label: "County" },
      { key: "gender", label: "Gender" },
      { key: "care_arrangement", label: "Care arrangement" },
      { key: "vulnerability", label: "Vulnerability" },
    ],
    metrics: [
      {
        key: "beneficiaries",
        label: "Beneficiaries",
        caption: "Total beneficiaries in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
      {
        key: "households",
        label: "Households",
        caption: "Total households in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
      {
        key: "guardians",
        label: "Guardians",
        caption: "Total registered guardians in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
      {
        key: "enrolments",
        label: "Enrolments",
        caption: "Programme enrolments in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
      {
        key: "exits",
        label: "Exits",
        caption: "Beneficiaries exited in selected scope",
        defaultDimension: "month",
        goodDirection: "down",
      },
      {
        key: "new_registrations",
        label: "New registrations",
        caption: "New beneficiary registrations in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
    ],
  },
  programmes: {
    key: "programmes",
    label: "Programmes",
    implemented: true,
    dimensions: programmeDimensions,
    filters: [
      { key: "programme", label: "Programme" },
      { key: "project", label: "Project" },
      { key: "status", label: "Status" },
    ],
    metrics: [
      {
        key: "active_programmes",
        label: "Active programmes",
        caption: "Programmes currently active in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
      {
        key: "active_enrolments",
        label: "Active enrolments",
        caption: "Active programme enrolments in selected scope",
        defaultDimension: "programme",
        goodDirection: "up",
      },
      {
        key: "activities_delivered",
        label: "Activities delivered",
        caption: "Activities delivered in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
      {
        key: "average_attendance",
        label: "Average attendance",
        caption: "Mean attendance per activity in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
      {
        key: "completion_rate",
        label: "Completion rate",
        caption: "Activities completed vs. planned in selected scope",
        defaultDimension: "month",
        goodDirection: "up",
      },
    ],
  },
  money: {
    key: "money",
    label: "Money",
    implemented: true,
    dimensions: moneyDimensions,
    filters: [
      { key: "donor_type", label: "Donor type" },
      { key: "currency", label: "Currency" },
      { key: "programme", label: "Programme" },
    ],
    metrics: [
      { key: "donations_received", label: "Donations received", defaultDimension: "month", goodDirection: "up" },
      { key: "allocations_made", label: "Allocations made", defaultDimension: "month", goodDirection: "up" },
      { key: "pool_balances", label: "Pool balances", defaultDimension: "month", goodDirection: "up" },
      { key: "funding_gaps", label: "Funding gaps", defaultDimension: "programme", goodDirection: "down" },
      { key: "donor_count", label: "Donor count", defaultDimension: "month", goodDirection: "up" },
    ],
  },
  impact: {
    key: "impact",
    label: "Impact",
    implemented: true,
    dimensions: [
      { key: "month", label: "Month", kind: "time" },
      { key: "project", label: "Project", kind: "categorical" },
      { key: "programme", label: "Programme", kind: "categorical" },
    ],
    filters: [{ key: "programme", label: "Programme" }],
    metrics: [
      { key: "indicator_average", label: "Indicator average", defaultDimension: "month", goodDirection: "up" },
      { key: "baseline_movement", label: "Baseline → current movement", defaultDimension: "project", goodDirection: "up" },
      { key: "beneficiaries_at_target", label: "Beneficiaries at target", defaultDimension: "month", goodDirection: "up" },
      { key: "improvement_rate", label: "Improvement rate", defaultDimension: "month", goodDirection: "up" },
    ],
  },
  operations: {
    key: "operations",
    label: "Operations",
    implemented: true,
    dimensions: [
      { key: "week", label: "Week", kind: "time" },
      { key: "project", label: "Project", kind: "categorical" },
    ],
    filters: [{ key: "project", label: "Project" }],
    metrics: [
      { key: "field_logs", label: "Field logs per week", defaultDimension: "week", goodDirection: "up" },
      { key: "reports_submitted", label: "Reports submitted", defaultDimension: "week", goodDirection: "up" },
      { key: "reports_overdue", label: "Reports overdue", defaultDimension: "week", goodDirection: "down" },
      { key: "data_quality", label: "Data quality score", defaultDimension: "week", goodDirection: "up" },
    ],
  },
  custom: {
    key: "custom",
    label: "Custom",
    implemented: false,
    dimensions: [{ key: "month", label: "Month", kind: "time" }],
    filters: [],
    metrics: [],
  },
};

export const TAB_ORDER: TabKey[] = ["people", "programmes", "money", "impact", "operations", "custom"];

export interface AnalyticsQuestion {
  tab: TabKey;
  metric: string;
  dimension: string;
  /** Optional second dimension → cross-tabulation */
  dimension2?: string;
  /** Time-series accumulation mode */
  mode?: "cumulative" | "new";
  filters: Record<string, string>;
  range: RangeKey;
  breakdowns: string[];
  drillDown?: { dimension: string; value: string };
}

export function defaultQuestion(tab: TabKey): AnalyticsQuestion {
  const cfg = TABS[tab];
  const metric = cfg.metrics[0]?.key ?? "";
  const dimension = cfg.metrics[0]?.defaultDimension ?? cfg.dimensions[0]?.key ?? "month";
  return { tab, metric, dimension, dimension2: undefined, mode: "cumulative", filters: {}, range: "12mo", breakdowns: [] };
}

export function dimensionKind(tab: TabKey, dimensionKey: string): DimensionKind {
  return TABS[tab].dimensions.find((d) => d.key === dimensionKey)?.kind ?? "categorical";
}

export function metricDef(tab: TabKey, metricKey: string): MetricDef | undefined {
  return TABS[tab].metrics.find((m) => m.key === metricKey);
}