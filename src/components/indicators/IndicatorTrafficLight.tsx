interface TrafficLightProps {
  actual: number | null | undefined;
  target: number | null | undefined;
  size?: 'sm' | 'md';
}

export function getTrafficLightStatus(actual: number | null | undefined, target: number | null | undefined) {
  if (actual == null || target == null || target === 0) return { color: 'grey', label: 'No Data', pct: 0 };
  const pct = (actual / target) * 100;
  if (pct >= 80) return { color: 'green', label: 'On Track', pct };
  if (pct >= 50) return { color: 'amber', label: 'At Risk', pct };
  return { color: 'red', label: 'Off Track', pct };
}

const dotColors: Record<string, string> = {
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-destructive',
  grey: 'bg-muted-foreground',
};

const labelColors: Record<string, string> = {
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-destructive',
  grey: 'text-muted-foreground',
};

export function IndicatorTrafficLight({ actual, target, size = 'sm' }: TrafficLightProps) {
  const status = getTrafficLightStatus(actual, target);
  const dotSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${dotColors[status.color]} ${dotSize} rounded-full inline-block`} />
      <span className={`text-xs font-medium ${labelColors[status.color]}`}>{status.label}</span>
    </span>
  );
}

export function TrafficLightSummaryBar({ indicators }: { indicators: Array<{ actual?: number | null; target?: number | null }> }) {
  const counts = { green: 0, amber: 0, red: 0, grey: 0 };
  indicators.forEach(i => {
    const s = getTrafficLightStatus(i.actual, i.target);
    counts[s.color as keyof typeof counts]++;
  });

  return (
    <div className="flex items-center gap-4 text-sm flex-wrap">
      <span className="flex items-center gap-1.5 cursor-pointer">
        <span className="h-3 w-3 rounded-full bg-success inline-block" />
        <span className="font-medium">{counts.green} On Track</span>
      </span>
      <span className="text-muted-foreground">|</span>
      <span className="flex items-center gap-1.5 cursor-pointer">
        <span className="h-3 w-3 rounded-full bg-warning inline-block" />
        <span className="font-medium">{counts.amber} At Risk</span>
      </span>
      <span className="text-muted-foreground">|</span>
      <span className="flex items-center gap-1.5 cursor-pointer">
        <span className="h-3 w-3 rounded-full bg-destructive inline-block" />
        <span className="font-medium">{counts.red} Off Track</span>
      </span>
      <span className="text-muted-foreground">|</span>
      <span className="flex items-center gap-1.5 cursor-pointer">
        <span className="h-3 w-3 rounded-full bg-muted-foreground inline-block" />
        <span className="font-medium">{counts.grey} No Data</span>
      </span>
    </div>
  );
}
