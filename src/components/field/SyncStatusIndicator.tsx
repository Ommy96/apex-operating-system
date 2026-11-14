import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shouldShowSyncIndicator } from '@/lib/syncIndicator';

interface Props {
  isOnline: boolean;
  isSyncing: boolean;
  pending: number;
  failed: number;
  conflicts?: number;
  className?: string;
  onClick?: () => void;
  compactOnMobile?: boolean;
  hideWhenSynced?: boolean;
}

/**
 * Persistent connectivity + sync indicator for Field Mode.
 * States: online / offline / syncing / N pending / conflicts.
 */
export function SyncStatusIndicator({ isOnline, isSyncing, pending, failed, conflicts = 0, className, onClick, compactOnMobile = false, hideWhenSynced = false }: Props) {
  if (hideWhenSynced && !shouldShowSyncIndicator({ isOnline, isSyncing, pending, failed, conflicts })) return null;
  const label = isSyncing
    ? 'Syncing…'
    : !isOnline
      ? 'Offline'
      : pending > 0
        ? `${pending} pending`
        : failed > 0
          ? `${failed} failed`
          : conflicts > 0 ? `${conflicts} conflicts` : 'All synced';

  const Icon = isSyncing ? RefreshCw : !isOnline ? WifiOff : pending > 0 || failed > 0 || conflicts > 0 ? AlertTriangle : CheckCircle2;

  const tone = isSyncing
    ? 'border-info/40 text-info bg-info/10'
    : !isOnline
      ? 'border-destructive/40 text-destructive bg-destructive/10'
      : pending > 0 || failed > 0 || conflicts > 0
        ? 'border-warning/40 text-warning bg-warning/10'
        : 'border-success/40 text-success bg-success/10';

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}
      title={`${label}${conflicts > 0 ? `; ${conflicts} conflicts` : ''}`}
      aria-label={`Sync status: ${label}${conflicts > 0 ? `; ${conflicts} conflicts` : ''}`}
      className={cn("h-8 shrink-0 gap-1.5 px-2 text-xs font-medium", tone, className)}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className={compactOnMobile ? 'hidden md:inline' : ''}>{label}</span>
        {compactOnMobile && <span className="md:hidden tabular-nums">{pending + failed + conflicts || (isSyncing ? '…' : null)}</span>}
        {conflicts > 0 && (
          <span className={cn("ml-1 rounded-full bg-destructive/20 px-1.5 text-[10px] text-destructive", compactOnMobile && 'hidden md:inline')}>{conflicts} conflict</span>
        )}
    </Button>
  );
}