import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export function useBranding() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: orgDetails, isLoading } = useQuery({
    queryKey: ["org-branding", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from("organizations")
        .select("primary_color, logo_url, name")
        .eq("id", orgId)
        .single();
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const primaryColor = orgDetails?.primary_color || null;
  const logoUrl = orgDetails?.logo_url || null;
  const orgName = orgDetails?.name || (currentOrganization as any)?.organization_name || "Ufanisi";

  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty("--brand-primary", primaryColor);
    } else {
      document.documentElement.style.removeProperty("--brand-primary");
    }
  }, [primaryColor]);

  useEffect(() => {
    document.title = `${orgName} — Ufanisi`;
  }, [orgName]);

  return {
    primaryColor,
    logoUrl,
    orgName,
    isLoaded: !isLoading,
  };
}
