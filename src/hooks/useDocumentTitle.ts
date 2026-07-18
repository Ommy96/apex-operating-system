import { useEffect } from "react";

/**
 * Set document.title to a friendly, record-scoped label so the browser tab
 * never leaks raw UUIDs. Passing null/undefined shows a "Loading…" title while
 * data is still fetching, and the previous title is restored on unmount.
 */
export function useDocumentTitle(name: string | null | undefined, suffix = "Ufanisi") {
  useEffect(() => {
    const previous = document.title;
    const label = name && name.trim() ? name.trim() : "Loading…";
    document.title = suffix ? `${label} · ${suffix}` : label;
    return () => { document.title = previous; };
  }, [name, suffix]);
}