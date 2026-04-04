import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useFeatureFlags, useFeatureFlagManagement } from '@/hooks/useSystemAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Flag, Loader2, Activity, AlertTriangle, Database, Zap, Clock } from 'lucide-react';

function HealthCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: 'green' | 'amber' | 'red' | 'slate'; icon: any }) {
  const colorMap = {
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    red: 'border-red-500/30 bg-red-500/10 text-red-400',
    slate: 'border-slate-600/30 bg-slate-700/30 text-slate-300',
  };
  return (
    <div className={`p-4 rounded-lg border ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xl font-bold font-mono">{value}</div>
    </div>
  );
}

export function SystemMonitoring() {
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags();
  const { toggleFlag } = useFeatureFlagManagement();

  // API response time measurement
  const [apiTime, setApiTime] = useState<number | null>(null);
  const measureApi = useCallback(async () => {
    const start = Date.now();
    await supabase.from('organizations').select('id').limit(1);
    setApiTime(Date.now() - start);
  }, []);

  useEffect(() => {
    measureApi();
    const interval = setInterval(measureApi, 60000);
    return () => clearInterval(interval);
  }, [measureApi]);

  // Edge function invocations (last 7 days)
  const { data: edgeStats = [] } = useQuery({
    queryKey: ['admin-edge-function-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('event_type')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .in('event_type', ['mpesa_transfer_completed', 'mpesa_transfer_failed', 'grant_reminder_sent', 'email_sent']);
      const counts: Record<string, number> = {};
      (data || []).forEach(r => { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });
      return Object.entries(counts).map(([event_type, count]) => ({ event_type, count }));
    },
    staleTime: 300000,
  });

  // Error rate (last 24h)
  const { data: errorCount = 0 } = useQuery({
    queryKey: ['admin-error-rate-24h'],
    queryFn: async () => {
      const { count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .or('event_type.ilike.%error%,event_type.ilike.%failed%');
      return count || 0;
    },
    staleTime: 300000,
  });

  // Database metrics
  const { data: dbMetrics } = useQuery({
    queryKey: ['admin-db-metrics'],
    queryFn: async () => {
      const [benRes, auditRes] = await Promise.all([
        supabase.from('beneficiaries').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
      ]);
      return { totalRecords: benRes.count || 0, totalEvents: auditRes.count || 0 };
    },
    staleTime: 300000,
  });

  const apiColor = apiTime === null ? 'slate' : apiTime < 200 ? 'green' : apiTime < 500 ? 'amber' : 'red';
  const errorColor = errorCount === 0 ? 'green' : errorCount <= 5 ? 'amber' : 'red';

  return (
    <div className="space-y-4">
      {/* System Health */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Activity className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">SYSTEM HEALTH</span>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <HealthCard
          label="API Response"
          value={apiTime !== null ? `${apiTime}ms` : '—'}
          color={apiColor}
          icon={Zap}
        />
        <HealthCard
          label="Errors (24h)"
          value={errorCount}
          color={errorColor}
          icon={AlertTriangle}
        />
        <HealthCard
          label="Beneficiary Records"
          value={(dbMetrics?.totalRecords || 0).toLocaleString()}
          color="slate"
          icon={Database}
        />
        <HealthCard
          label="Audit Events"
          value={(dbMetrics?.totalEvents || 0).toLocaleString()}
          color="slate"
          icon={Clock}
        />
      </div>

      {/* Edge Function Stats */}
      {edgeStats.length > 0 && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Edge Function Invocations (7 Days)</h3>
          <div className="space-y-2">
            {edgeStats.map(s => (
              <div key={s.event_type} className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-mono text-xs">{s.event_type}</span>
                <Badge variant="outline" className="border-slate-600 text-slate-300 font-mono">{s.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs text-slate-500">
        Last updated: {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>

      {/* Feature Flag Management */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Flag className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">FEATURE FLAG MANAGEMENT</span>
        <span className="ml-auto text-xs text-slate-500">{featureFlags?.length || 0} flags</span>
      </div>

      {flagsLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {featureFlags?.map((flag) => (
            <div key={flag.id} className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
              <Switch
                checked={flag.is_enabled}
                onCheckedChange={(checked) => toggleFlag.mutate({ flagId: flag.id, isEnabled: checked })}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-200 text-sm">{flag.flag_name}</h4>
                  <Badge variant="outline" className="text-[10px] font-mono border-slate-600 text-slate-400">
                    {flag.flag_key}
                  </Badge>
                  {flag.is_enabled ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-700 text-emerald-400">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-500">Inactive</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{flag.description}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {flag.target_tiers.map((tier) => (
                  <Badge key={tier} variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                    {tier}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {(!featureFlags || featureFlags.length === 0) && (
            <div className="text-center py-12 text-slate-500">
              No feature flags configured
            </div>
          )}
        </div>
      )}
    </div>
  );
}
