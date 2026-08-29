import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "sonner";

const PREFS = [
  { key: "grant_report_due", label: "Grant report due", desc: "Get notified when a grant report deadline is approaching" },
  { key: "safeguarding_incident", label: "Safeguarding incident reported", desc: "Get notified when a safeguarding incident is reported" },
  { key: "complaint_unresolved_7d", label: "Complaint unresolved 7+ days", desc: "Get notified when a complaint remains open for over 7 days" },
  { key: "funding_payment_due", label: "Funding payment due", desc: "Get notified when a recurring funding payment is due" },
];

export function NotificationSettings() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  const { data: savedPrefs } = useQuery({
    queryKey: ["notification-prefs", user?.id, orgId],
    queryFn: async () => {
      if (!user?.id || !orgId) return [];
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("org_id", orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!orgId,
  });

  useEffect(() => {
    if (savedPrefs) {
      const map: Record<string, boolean> = {};
      PREFS.forEach(p => { map[p.key] = true; }); // default on
      savedPrefs.forEach(sp => { map[sp.preference_key] = sp.is_enabled; });
      setPrefs(map);
    }
  }, [savedPrefs]);

  const saveMutation = useMutation({
    mutationFn: async (newPrefs: Record<string, boolean>) => {
      if (!user?.id || !orgId) throw new Error("No user/org");
      for (const [key, enabled] of Object.entries(newPrefs)) {
        const { data: existing, error: readError } = await supabase
          .from("user_notification_preferences")
          .select("id")
          .eq("user_id", user.id)
          .eq("org_id", orgId)
          .eq("preference_key", key)
          .maybeSingle();
        if (readError) throw readError;

        if (existing) {
          const { error } = await supabase
            .from("user_notification_preferences")
            .update({ is_enabled: enabled })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_notification_preferences")
            .insert({ user_id: user.id, org_id: orgId, preference_key: key, is_enabled: enabled });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast.success("Notification preferences saved");
    },
    onError: (e: any) => {
      // Roll the toggles back so a failed save visibly reverts.
      if (savedPrefs) {
        const map: Record<string, boolean> = {};
        PREFS.forEach((p) => { map[p.key] = true; });
        savedPrefs.forEach((sp: any) => { map[sp.preference_key] = sp.is_enabled; });
        setPrefs(map);
      }
      toast.error(e?.message || "Could not save notification preferences");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Bell className="h-5 w-5" />Notification Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose which notifications you receive via email</p>
      </div>
      <Card className="workspace-card">
        <CardContent className="p-6 space-y-6">
          {PREFS.map(p => (
            <div key={p.key} className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">{p.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
              <Switch checked={prefs[p.key] ?? true} onCheckedChange={v => setPrefs(prev => ({ ...prev, [p.key]: v }))} />
            </div>
          ))}
          <Button onClick={() => saveMutation.mutate(prefs)} disabled={saveMutation.isPending} className="w-full sm:w-auto">
            {saveMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
