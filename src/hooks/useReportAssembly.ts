import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeResult } from './useResultsFramework';
import { ResultMeasurement, classifyAchievement } from '@/lib/resultsFramework';
import { useOrganization } from "./useOrganization";

const sb = supabase as any;

export interface AssembledReportSection {
  title: string;
  content: string;
}

export interface AssembledReport {
  title: string;
  organization: string | null;
  program: string | null;
  period: { start: string; end: string };
  generatedAt: string;
  sections: AssembledReportSection[];
  indicators: Array<ResultMeasurement & {
    id: string;
    name: string;
    unit: string | null;
    target: number | null;
    current: number | null;
    percent: number | null;
    status: "on_track" | "at_risk" | "off_track" | "no_data";
  }>;
  narratives: Array<{ id: string; title: string | null; content: string | null; created_at: string }>;
  dataQuality: { open: number; resolved: number };
}

export interface AssembleInput {
  programId?: string | null;
  periodStart: string;
  periodEnd: string;
  title?: string;
  includeIndicators?: boolean;
  includeNarratives?: boolean;
  includeQuality?: boolean;
}

function classify(pct: number | null) {
  if (pct === null) return "no_data" as const;
  if (pct >= 80) return "on_track" as const;
  if (pct >= 50) return "at_risk" as const;
  return "off_track" as const;
}

export function useReportAssembly() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: async (input: AssembleInput): Promise<AssembledReport> => {
      if (!orgId) throw new Error("No organisation");

      if (input.periodEnd < input.periodStart) throw new Error('Invalid reporting period');
      let query = sb.from('indicators').select('id').eq('organization_id', orgId).eq('is_active', true).is('deleted_at', null);
      if (input.programId) query = query.contains('program_ids', [input.programId]);
      const { data: definitions, error: definitionsError } = await query;
      if (definitionsError) throw definitionsError;
      const indicatorRows = input.includeIndicators === false ? [] : await Promise.all((definitions ?? []).map(async (i: { id: string }) => {
        const { data: periods, error } = await sb.rpc('list_results_snapshots', { _indicator: i.id });
        if (error) throw error;
        const approved = periods?.find((p: any) => p.period_start === input.periodStart && p.period_end === input.periodEnd);
        const measured = approved?.snapshot ?? await computeResult(i.id, input.periodStart, input.periodEnd);
        return { ...measured, status: classifyAchievement(measured.percent ?? null), approval: approved ? 'approved' : 'unapproved', report_version: approved?.version ?? null };
      }));

      // Narratives (graceful degradation - table may not exist)
      let narratives: AssembledReport["narratives"] = [];
      if (input.includeNarratives !== false) {
        try {
          const { data, error } = await sb
            .from("narrative_reports")
            .select("id, title, content, created_at")
            .eq("organization_id", orgId)
            .gte("created_at", input.periodStart)
            .lte("created_at", input.periodEnd + "T23:59:59")
            .limit(20);
          if (error && error.code !== 'PGRST205' && error.code !== '42P01') throw error;
          narratives = data ?? [];
        } catch {
          narratives = [];
        }
      }

      // Data quality
      let dq = { open: 0, resolved: 0 };
      if (input.includeQuality !== false) {
        const { data: flags = [], error: flagsError } = await sb
          .from("data_quality_flags")
          .select("is_resolved")
          .eq("organization_id", orgId)
          .gte("created_at", input.periodStart)
          .lte("created_at", input.periodEnd + "T23:59:59");
        if (flagsError) throw flagsError;
        dq = {
          open: (flags ?? []).filter((f: any) => !f.is_resolved).length,
          resolved: (flags ?? []).filter((f: any) => f.is_resolved).length,
        };
      }

      let program: string | null = null;
      if (input.programId) { const { data, error } = await sb.from('programs').select('name').eq('id', input.programId).maybeSingle(); if (error) throw error; program = data?.name ?? null; }

      const onTrack = indicatorRows.filter((r) => r.status === "on_track").length;
      const offTrack = indicatorRows.filter((r) => r.status === "off_track").length;
      const atRisk = indicatorRows.filter((r) => r.status === "at_risk").length;

      const sections: AssembledReportSection[] = [
        {
          title: "Executive Summary",
          content: `Reporting period ${input.periodStart} to ${input.periodEnd}. ${indicatorRows.length} active indicators tracked: ${onTrack} on track, ${atRisk} at risk, ${offTrack} off track. Data quality: ${dq.open} open flags, ${dq.resolved} resolved.`,
        },
        {
          title: "Performance Highlights",
          content: indicatorRows
            .filter((r) => r.status === "on_track")
            .slice(0, 5)
            .map((r) => `• ${r.name}: ${r.current ?? "—"} / ${r.target ?? "—"} ${r.unit ?? ""} (${r.percent?.toFixed(0)}%)`)
            .join("\n") || "No on-track indicators in this period.",
        },
        {
          title: "Areas Requiring Attention",
          content: indicatorRows
            .filter((r) => r.status === "off_track")
            .slice(0, 5)
            .map((r) => `• ${r.name}: ${r.current ?? "—"} / ${r.target ?? "—"} ${r.unit ?? ""} (${r.percent?.toFixed(0)}%)`)
            .join("\n") || "No off-track indicators flagged.",
        },
      ];

      return {
        title: input.title || `M&E Report ${input.periodStart} – ${input.periodEnd}`,
        organization: currentOrganization?.organization_name ?? null,
        program,
        period: { start: input.periodStart, end: input.periodEnd },
        generatedAt: new Date().toISOString(),
        sections,
        indicators: indicatorRows,
        narratives,
        dataQuality: dq,
      };
    },
  });
}