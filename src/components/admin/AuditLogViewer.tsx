import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGlobalAuditLogs } from '@/hooks/useSystemAdmin';
import { Search, Loader2, Eye, FileText, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const EVENT_COLORS: Record<string, string> = {
  created: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  updated: 'bg-blue-900/50 text-blue-300 border-blue-700',
  deleted: 'bg-red-900/50 text-red-300 border-red-700',
  role_change: 'bg-amber-900/50 text-amber-300 border-amber-700',
  role_granted: 'bg-purple-900/50 text-purple-300 border-purple-700',
  role_revoked: 'bg-orange-900/50 text-orange-300 border-orange-700',
  approval_request_created: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
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
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Eye className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">GLOBAL AUDIT TRAIL</span>
        <span className="ml-auto text-xs text-slate-500">{filteredLogs?.length || 0} events</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search events, entities, user IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-slate-300">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
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
      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/80 border-slate-700 hover:bg-slate-800/80">
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Timestamp</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Event</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Entity</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">User</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs?.map((log) => (
              <TableRow key={log.id} className="border-slate-700/50 hover:bg-slate-800/30">
                <TableCell className="text-xs text-slate-400 font-mono whitespace-nowrap">
                  {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${EVENT_COLORS[log.event_type] || 'border-slate-600 text-slate-400'}`}>
                    {log.event_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <span className="text-slate-300">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="text-slate-500 ml-1 font-mono text-[10px]">
                        {log.entity_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-400 font-mono">
                  {log.user_id ? `${log.user_id.slice(0, 8)}...` : '—'}
                </TableCell>
                <TableCell>
                  {log.metadata && (
                    <span className="text-xs text-slate-500 truncate block max-w-[200px]">
                      {typeof log.metadata === 'object' ? JSON.stringify(log.metadata).slice(0, 60) + '...' : String(log.metadata)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!filteredLogs || filteredLogs.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
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
