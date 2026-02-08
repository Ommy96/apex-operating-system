import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, Wifi, WifiOff, Clock, AlertCircle, CheckCircle,
  Bell, BellOff, Activity, TrendingUp, Database
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';

interface DataSource {
  id: string;
  name: string;
  lastUpdated: Date;
  status: 'online' | 'offline' | 'error';
  recordCount: number;
  changesSince?: number;
}

interface RealtimeIndicatorsProps {
  onDataUpdate?: (source: string, data: any) => void;
  className?: string;
}

export function RealtimeIndicators({ onDataUpdate, className = '' }: RealtimeIndicatorsProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organization_id;

  // Fetch programs dynamically to build data sources
  const { data: programs = [] } = useQuery({
    queryKey: ['realtime-programs', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('realtime-notifications') === 'true';
  });
  const [lastGlobalUpdate, setLastGlobalUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // Build data sources from programs + beneficiary_services counts
  const fetchDataCounts = useCallback(async () => {
    if (!organizationId || programs.length === 0) return;
    try {
      const results: DataSource[] = await Promise.all(
        programs.map(async (program) => {
          const { count, error } = await supabase
            .from('beneficiary_services')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('program_id', program.id)
            .in('status', ['active', 'Active']);

          return {
            id: program.id,
            name: program.name,
            lastUpdated: new Date(),
            status: error ? 'error' as const : 'online' as const,
            recordCount: count || 0,
          };
        })
      );
      setDataSources(results);
      setLastGlobalUpdate(new Date());
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, [organizationId, programs]);

  useEffect(() => { fetchDataCounts(); }, [fetchDataCounts]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDataCounts, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDataCounts]);

  // Real-time on beneficiary_services
  useEffect(() => {
    const channel = supabase
      .channel('realtime-enrollments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beneficiary_services' }, () => {
        fetchDataCounts();
        setLastGlobalUpdate(new Date());
        toast.success('Enrollment data updated', { duration: 3000, icon: '🔄' });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDataCounts]);

  useEffect(() => {
    localStorage.setItem('realtime-notifications', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  const handleManualRefresh = async () => {
    await fetchDataCounts();
    toast.success('Data refreshed successfully');
  };

  const getStatusIcon = (status: DataSource['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'offline': return <WifiOff className="h-4 w-4 text-muted-foreground" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: DataSource['status']) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'offline': return 'bg-muted-foreground';
      case 'error': return 'bg-destructive';
    }
  };

  const onlineCount = dataSources.filter(ds => ds.status === 'online').length;

  return (
    <Card className={`shadow-elevation-2 border-primary/20 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Activity className="h-5 w-5 text-primary" />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'} animate-pulse`} />
            </div>
            Real-time Data Status
            <Badge variant={isConnected ? "default" : "destructive"}>
              {onlineCount}/{dataSources.length} Online
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleManualRefresh} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setNotificationsEnabled(!notificationsEnabled)} className="h-8 w-8 p-0">
              {notificationsEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
          <div className="flex items-center gap-3">
            {isConnected ? <Wifi className="h-5 w-5 text-success" /> : <WifiOff className="h-5 w-5 text-destructive" />}
            <div>
              <p className="font-medium text-sm">{isConnected ? 'Connected' : 'Disconnected'}</p>
              <p className="text-xs text-muted-foreground">Last updated {formatDistanceToNow(lastGlobalUpdate, { addSuffix: true })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Auto-refresh: {autoRefresh ? `${refreshInterval / 1000}s` : 'Off'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2"><Database className="h-4 w-4" />Programs (Enrollment Data)</h4>
          {dataSources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No programs configured</p>
          ) : dataSources.map(source => (
            <div key={source.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {getStatusIcon(source.status)}
                  <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(source.status)}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{source.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.recordCount} enrolled • Updated {formatDistanceToNow(source.lastUpdated, { addSuffix: true })}
                  </p>
                </div>
              </div>
              {source.changesSince !== undefined && source.changesSince > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">+{source.changesSince}</Badge>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Settings</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Push Notifications</span></div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Auto Refresh</span></div>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          {autoRefresh && (
            <div className="flex items-center justify-between pl-6">
              <span className="text-sm text-muted-foreground">Interval</span>
              <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="text-sm border rounded px-2 py-1">
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
              </select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
