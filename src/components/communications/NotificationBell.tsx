import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCommunications } from "@/hooks/useCommunications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { useComplianceAlerts } from '@/hooks/useComplianceAlerts';
import { COMPLIANCE_LEVEL, COMPLIANCE_SETTINGS_URL } from '@/lib/complianceAlerts';

const severityStyles: Record<string, string> = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } = useCommunications();
  const complianceAlerts = useComplianceAlerts();
  const navigate = useNavigate();
  const trayCount = unreadCount + complianceAlerts.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {trayCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
              {trayCount > 9 ? "9+" : trayCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {complianceAlerts.map(alert => (
            <Button key={alert.id} variant="ghost"
              className="h-auto w-full rounded-none justify-start whitespace-normal px-4 py-3 text-left border-b"
              onClick={() => { setOpen(false); navigate(COMPLIANCE_SETTINGS_URL); }}>
              <div className="min-w-0 w-full space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">{alert.title}</span>
                  <Badge variant="outline" className={cn('text-[10px]',
                    alert.level.toLowerCase() === COMPLIANCE_LEVEL.RED.toLowerCase()
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-warning/30 bg-warning/10 text-warning')}>
                    {alert.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-normal">{alert.message}</p>
              </div>
            </Button>
          ))}
          {notifications.length === 0 && complianceAlerts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => (
                <button
                  key={n.id}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                    !n.is_read && "bg-accent/5"
                  )}
                  onClick={() => !n.is_read && markAsRead.mutate(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", !n.is_read ? "bg-accent" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{n.title}</span>
                        <Badge variant="outline" className={cn("text-[9px] px-1 py-0", severityStyles[n.severity] || "")}>
                          {n.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
