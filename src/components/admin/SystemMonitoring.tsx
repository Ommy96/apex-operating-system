import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useFeatureFlags, useFeatureFlagManagement } from '@/hooks/useSystemAdmin';
import { Flag, Loader2 } from 'lucide-react';

export function SystemMonitoring() {
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags();
  const { toggleFlag } = useFeatureFlagManagement();

  return (
    <div className="space-y-4">
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
