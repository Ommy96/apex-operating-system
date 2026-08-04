import { useEffect } from "react";
import { PRODUCT_NAME } from "@/config/brand";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Set document.title to a friendly, record-scoped label so the browser tab
 * never leaks raw UUIDs. Title pattern:
 *   "{record name} · {orgName} · ApexOS"  (falls back to "{record} · ApexOS")
 * Passing null/undefined shows a "Loading…" title while data is still
 * fetching, and the previous title is restored on unmount.
 */
export function useDocumentTitle(name: string | null | undefined, suffix?: string) {
  const { currentOrganization } = useOrganization();
  const orgName = (currentOrganization as any)?.organization_name as string | undefined;

  useEffect(() => {
    const previous = document.title;
    const label = name && name.trim() ? name.trim() : "Loading…";
    const parts = [label, suffix ?? orgName, PRODUCT_NAME].filter(
      (p): p is string => !!p && p.trim().length > 0,
    );
    // Keep tabs readable: drop the org segment when the title gets long.
    let title = parts.join(" · ");
    if (title.length > 70 && parts.length === 3) {
      title = `${parts[0]} · ${PRODUCT_NAME}`;
    }
    document.title = title;
    return () => { document.title = previous; };
  }, [name, suffix, orgName]);
}