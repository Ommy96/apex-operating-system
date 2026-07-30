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
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Crown className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-semibold text-muted-foreground">Partner Access Audit Log</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by organization..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-muted-foreground/50 border-border text-muted-foreground placeholder:text-muted-foreground max-w-sm"
        />
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted-foreground/80 border-border hover:bg-muted-foreground/80">
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Organization</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Action</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Performed By</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Notes</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log: any) => (
              <TableRow key={log.id} className="border-border/50 hover:bg-muted-foreground/30">
                <TableCell className="text-muted-foreground font-medium">
                  {(log.organizations as any)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      log.action === 'granted'
                        ? 'bg-warning/30 text-warning border-warning/30 text-xs'
                        : log.action === 'revoked'
                        ? 'bg-destructive/30 text-destructive border-destructive/30 text-xs'
                        : 'bg-muted-foreground text-muted-foreground border-border text-xs'
                    }
                  >
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {log.performed_by ? getProfileName(log.performed_by) : 'System'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                  {log.notes || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                </TableCell>
              </TableRow>
            ))}
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
