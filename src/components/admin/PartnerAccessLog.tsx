import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Crown, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function PartnerAccessLog() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['partner-access-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_access_log' as any)
        .select('*, organizations!inner(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['partner-log-profiles'],
    queryFn: async () => {
      const userIds = [...new Set((logs || []).map((l: any) => l.performed_by).filter(Boolean))];
      if (userIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
      return data || [];
    },
    enabled: !!logs && logs.length > 0,
  });

  const getProfileName = (userId: string) => {
    const profile = profiles?.find((p: any) => p.user_id === userId);
    return profile?.full_name || profile?.email || 'System';
  };

  const filteredLogs = (logs || []).filter((log: any) => {
    if (!searchQuery) return true;
    const orgName = (log.organizations as any)?.name || '';
    return orgName.toLowerCase().includes(searchQuery.toLowerCase());
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
      <div className="flex items-center gap-3">
        <Crown className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-slate-100">Partner Access Audit Log</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Filter by organization..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 max-w-sm"
        />
      </div>

      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/80 border-slate-700 hover:bg-slate-800/80">
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Organization</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Action</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Performed By</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Notes</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log: any) => (
              <TableRow key={log.id} className="border-slate-700/50 hover:bg-slate-800/30">
                <TableCell className="text-slate-200 font-medium">
                  {(log.organizations as any)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      log.action === 'granted'
                        ? 'bg-amber-900/30 text-amber-300 border-amber-700 text-xs'
                        : log.action === 'revoked'
                        ? 'bg-red-900/30 text-red-300 border-red-700 text-xs'
                        : 'bg-slate-700 text-slate-300 border-slate-600 text-xs'
                    }
                  >
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300 text-sm">
                  {log.performed_by ? getProfileName(log.performed_by) : 'System'}
                </TableCell>
                <TableCell className="text-slate-400 text-sm max-w-[300px] truncate">
                  {log.notes || '—'}
                </TableCell>
                <TableCell className="text-slate-400 text-sm">
                  {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                </TableCell>
              </TableRow>
            ))}
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  No partner access log entries
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
