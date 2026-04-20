import { ShieldCheck } from "lucide-react";

/**
 * Persistent privacy notice rendered at the top of the Analytics &
 * Reporting Center, above the global filter bar.
 *
 * Reinforces that all visualisations are aggregated, never PII.
 */
export function PrivacyBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-rose-200/60 bg-rose-50/70 px-4 py-3 text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-100"
      role="note"
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
      <div className="text-xs leading-relaxed">
        <span className="font-semibold">Aggregated data only.</span>{" "}
        No personally identifiable information is displayed on these dashboards.
        Compliant with the Kenya Data Protection Act 2019.
      </div>
    </div>
  );
}
