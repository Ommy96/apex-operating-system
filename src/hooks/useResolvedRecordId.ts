import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { isUuid } from "@/lib/recordUrls";

export type RecordKind = "beneficiary" | "household" | "program" | "project" | "activity";

const CONFIG: Record<
  RecordKind,
  { table: string; column: string; previous?: string }
> = {
  beneficiary: { table: "beneficiaries", column: "beneficiary_code" },
  household: { table: "households", column: "household_code" },
  program: { table: "programs", column: "slug", previous: "previous_slugs" },
  project: { table: "projects", column: "slug", previous: "previous_slugs" },
  activity: { table: "activities", column: "slug", previous: "previous_slugs" },
};

interface Options {
  /** Build the canonical path once the readable identifier is known. */
  toPath?: (identifier: string) => string;
}

/**
 * Resolve a route param that may be a readable code/slug OR a legacy UUID.
 *
 * - Lookups are always organization-scoped: a code from another org never resolves.
 * - Legacy UUID URLs keep working and are replaced with the canonical readable URL.
 * - Renamed entities keep working through `previous_slugs`.
 */
export function useResolvedRecordId(
  param: string | undefined,
  kind: RecordKind,
  options: Options = {},
) {
  const { toPath } = options;
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgId = (currentOrganization as any)?.organization_id as string | undefined;

  const [id, setId] = useState<string | null>(isUuid(param) ? param! : null);
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cfg = CONFIG[kind];

    const run = async () => {
      if (!param) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      if (!orgId) {
        // Org context not ready yet — hold on a UUID param so the page can render.
        setLoading(true);
        return;
      }
      setLoading(true);
      setNotFound(false);

      const select = `id, ${cfg.column}`;
      let row: any = null;

      if (isUuid(param)) {
        const { data } = await supabase
          .from(cfg.table as any)
          .select(select)
          .eq("id", param)
          .eq("organization_id", orgId)
          .maybeSingle();
        row = data;
      } else {
        const { data } = await supabase
          .from(cfg.table as any)
          .select(select)
          .eq(cfg.column, param)
          .eq("organization_id", orgId)
          .maybeSingle();
        row = data;

        if (!row && cfg.previous) {
          const { data: prev } = await supabase
            .from(cfg.table as any)
            .select(select)
            .contains(cfg.previous, [param])
            .eq("organization_id", orgId)
            .maybeSingle();
          row = prev;
        }
      }

      if (cancelled) return;

      if (!row) {
        setId(null);
        setIdentifier(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setId(row.id);
      setIdentifier(row[cfg.column] ?? null);
      setLoading(false);

      const canonical = row[cfg.column] as string | undefined;
      if (canonical && canonical !== param && toPath) {
        navigate(toPath(canonical), { replace: true });
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, kind, orgId]);

  return { id, identifier, loading, notFound };
}
