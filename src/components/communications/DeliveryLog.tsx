import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ensureWritten } from "@/lib/settingsWrite";
import { DELIVERY_STATUS, DELIVERY_STATUS_LABEL as STATUS_LABEL, isRetryable, isStatus, normStatus } from "@/lib/deliveryStatus";

export function DeliveryLog() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["message-deliveries", orgId || ""],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("message_deliveries")
        .select("id,channel,source,recipient_contact,subject,status,attempts,last_error,created_at,sent_at")
        .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
  useEffect(() => { if (loadError) toast.error(`Could not load delivery log: ${(loadError as Error).message}`); }, [loadError]);
  useRealtimeSubscription([{ table: "message_deliveries", queryKeys: [["message-deliveries", orgId || ""]], orgId, enabled: !!orgId }]);

  const retry = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("delivery-retry", { body: { delivery_id: id } });
      if (error) throw error;
      return data as { success: boolean; status: string; duplicate: boolean; error: string | null };
    },
    onSuccess: (r) => {
      if (r.success) toast.success(r.duplicate ? "Already sent — no duplicate was created" : "Message sent");
      else toast.error(r.error || STATUS_LABEL[normStatus(r.status)] || "Not sent");
      qc.invalidateQueries({ queryKey: ["message-deliveries"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <QuietHoursCard />
      <Card>
        <CardHeader><CardTitle className="text-base">Delivery log</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)
            : !data?.length ? <p className="text-sm text-muted-foreground py-6 text-center">No messages sent yet.</p>
            : data.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3 border border-border rounded-md p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">{d.channel}</Badge>
                    <Badge variant={isStatus(d.status, DELIVERY_STATUS.SENT) ? "default" : isRetryable(d.status) || isStatus(d.status, DELIVERY_STATUS.BLOCKED_SENSITIVE) ? "destructive" : "secondary"}>
                      {STATUS_LABEL[normStatus(d.status)] ?? d.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{d.source} · {d.attempts} attempt(s) · {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm truncate">{d.subject || "(no subject)"} → {d.recipient_contact}</p>
                  {d.last_error && !isStatus(d.status, DELIVERY_STATUS.SENT) && <p className="text-xs text-destructive">{d.last_error}</p>}
                </div>
                {isRetryable(d.status) && (
                  <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(d.id)}>
                    <RotateCw className="h-3.5 w-3.5 mr-1" /> Retry
                  </Button>
                )}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function QuietHoursCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["comm-settings", user?.id || ""],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("user_communication_settings").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => { if (loadError) toast.error(`Could not load quiet hours: ${(loadError as Error).message}`); }, [loadError]);
  const [form, setForm] = useState({ quiet_hours_enabled: false, quiet_start: "21:00", quiet_end: "07:00" });
  useEffect(() => {
    if (data) setForm({ quiet_hours_enabled: data.quiet_hours_enabled, quiet_start: data.quiet_start.slice(0, 5), quiet_end: data.quiet_end.slice(0, 5) });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await (supabase as any).from("user_communication_settings")
        .upsert({ user_id: user!.id, ...form, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Nairobi", updated_at: new Date().toISOString() })
        .select("user_id");
      ensureWritten(res as any, "quiet hours");
    },
    onSuccess: () => { toast.success("Quiet hours saved"); qc.invalidateQueries({ queryKey: ["comm-settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-28 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">My quiet hours</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={form.quiet_hours_enabled} onCheckedChange={(v) => setForm({ ...form, quiet_hours_enabled: v })} />
          <Label>Hold non-urgent messages</Label>
        </div>
        <div><Label className="text-xs">From</Label><Input type="time" value={form.quiet_start} onChange={(e) => setForm({ ...form, quiet_start: e.target.value })} /></div>
        <div><Label className="text-xs">Until</Label><Input type="time" value={form.quiet_end} onChange={(e) => setForm({ ...form, quiet_end: e.target.value })} /></div>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        <p className="text-xs text-muted-foreground w-full">Account and invitation emails still arrive. Held messages appear in the log and can be retried later.</p>
      </CardContent>
    </Card>
  );
}
