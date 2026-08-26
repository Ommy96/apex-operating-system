import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useOrgStaff } from "@/hooks/useOrgStaff";

interface StaffSelectProps {
  orgId?: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  /** Adds an explicit "unassigned" option with this value. */
  noneValue?: string;
  noneLabel?: string;
  className?: string;
}

/**
 * Canonical picker for people who can be assigned work: every member of the
 * current organisation, with their profile name/email and org role.
 * Never renders a silent blank — loading, empty and error states are explicit.
 */
export function StaffSelect({
  orgId,
  value,
  onValueChange,
  placeholder = "Select staff",
  noneValue,
  noneLabel = "— Unassigned —",
  className,
}: StaffSelectProps) {
  const { data: staff = [], isLoading, isError, error, refetch, isFetching } = useOrgStaff(orgId);

  if (isLoading) return <Skeleton className={className ? `h-10 w-full ${className}` : "h-10 w-full"} />;

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="flex-1 text-xs text-destructive truncate">
          Couldn't load staff{(error as any)?.message ? ` — ${(error as any).message}` : ""}
        </span>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Retry
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {noneValue !== undefined && <SelectItem value={noneValue}>{noneLabel}</SelectItem>}
        {staff.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No members in this organisation yet — invite people from Settings → Users &amp; access.
          </div>
        ) : (
          staff.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              <span className="flex items-center gap-2">
                <span>{m.label}</span>
                {(m.job_title || m.role) && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {m.job_title || m.role}
                  </span>
                )}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
