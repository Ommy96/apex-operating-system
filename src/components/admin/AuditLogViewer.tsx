import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGlobalAuditLogs } from '@/hooks/useSystemAdmin';
import { Search, Loader2, Eye, FileText, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const EVENT_COLORS: Record<string, string> = {
  created: 'bg-success/50 text-success border-success/30',
  updated: 'bg-info/50 text-info border-info/30',
  deleted: 'bg-destructive/50 text-destructive border-destructive/30',
  role_change: 'bg-warning/50 text-warning border-warning/30',
  role_granted: 'bg-info/50 text-info border-info/30',
  role_revoked: 'bg-warning/50 text-warning border-warning/30',
  approval_request_created: 'bg-info/50 text-info border-info/30',
};

export function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [limit, setLimit] = useState(100);
  
  const { data: logs, isLoading } = useGlobalAuditLogs({ 
    eventType: eventFilter === 'all' ? undefined : eventFilter,
    limit 
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.event_type?.toLowerCase().includes(search) ||
      log.entity_type?.toLowerCase().includes(search) ||
      log.entity_id?.toLowerCase().includes(search) ||
      log.user_id?.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">GLOBAL AUDIT TRAIL</span>
        <span className="ml-auto text-xs text-muted-foreground">{filteredLogs?.length || 0} events</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events, entities, user IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted-foreground/50 border-border text-muted-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[180px] bg-muted-foreground/50 border-border text-muted-foreground">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent className="bg-muted-foreground border-border">
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="role_change">Role Changes</SelectItem>
            <SelectItem value="role_granted">Role Granted</SelectItem>
            <SelectItem value="role_revoked">Role Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted-foreground/80 border-border hover:bg-muted-foreground/80">
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Timestamp</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Event</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Entity</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">User</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs?.map((log) => (
              <TableRow key={log.id} className="border-border/50 hover:bg-muted-foreground/30">
                <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${EVENT_COLORS[log.event_type] || 'border-border text-muted-foreground'}`}>
                    {log.event_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <span className="text-muted-foreground">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="text-muted-foreground ml-1 font-mono text-[10px]">
                        {log.entity_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {log.user_id ? `${log.user_id.slice(0, 8)}...` : '—'}
                </TableCell>
                <TableCell>
                  {log.metadata && (
                    <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
                      {typeof log.metadata === 'object' ? JSON.stringify(log.metadata).slice(0, 60) + '...' : String(log.metadata)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!filteredLogs || filteredLogs.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
