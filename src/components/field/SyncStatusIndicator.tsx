import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  isOnline: boolean;
  isSyncing: boolean;
  pending: number;
  failed: number;
  conflicts?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * Persistent connectivity + sync indicator for Field Mode.
 * States: online / offline / syncing / N pending / conflicts.
 */
export function SyncStatusIndicator({ isOnline, isSyncing, pending, failed, conflicts = 0, className, onClick }: Props) {
  const label = isSyncing
    ? 'Syncing…'
    : !isOnline
      ? 'Offline'
      : pending > 0
        ? `${pending} pending`
        : failed > 0
          ? `${failed} failed`
          : 'All synced';

  const Icon = isSyncing ? RefreshCw : !isOnline ? WifiOff : pending > 0 || failed > 0 ? AlertTriangle : CheckCircle2;

  const tone = isSyncing
    ? 'border-info/40 text-info bg-info/10'
    : !isOnline
      ? 'border-destructive/40 text-destructive bg-destructive/10'
      : pending > 0 || failed > 0
        ? 'border-warning/40 text-warning bg-warning/10'
        : 'border-success/40 text-success bg-success/10';

  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center", className)}>
      <Badge variant="outline" className={cn("gap-1.5 px-2 py-1 text-xs font-medium", tone)}>
        {isOnline && !isSyncing ? <Wifi className="h-3 w-3" /> : <Icon className={cn("h-3 w-3", isSyncing && "animate-spin")} />}
        {label}
        {conflicts > 0 && (
          <span className="ml-1 rounded-full bg-destructive/20 px-1.5 text-[10px] text-destructive">{conflicts} conflict</span>
        )}
      </Badge>
    </button>
  );
}