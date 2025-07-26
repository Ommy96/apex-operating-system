import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Bell,
  BellOff,
  Activity,
  TrendingUp,
  TrendingDown,
  Database
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { supabase } from '@/integrations/supabase/client';

interface DataSource {
  id: string;
  name: string;
  table: string;
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
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: 'children',
      name: 'Children',
      table: 'children',
      lastUpdated: new Date(),
      status: 'online',
      recordCount: 0
    },
    {
      id: 'feeding',
      name: 'Feeding Program',
      table: 'feeding_program',
      lastUpdated: new Date(),
      status: 'online',
      recordCount: 0
    },
    {
      id: 'kipawa',
      name: 'Kipawa Program',
      table: 'kipawa_sato',
      lastUpdated: new Date(),
      status: 'online',
      recordCount: 0
    },
    {
      id: 'empowerment',
      name: 'Self Empowerment',
      table: 'self_empowerment',
      lastUpdated: new Date(),
      status: 'online',
      recordCount: 0
    }
  ]);

  const [isConnected, setIsConnected] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('realtime-notifications') === 'true';
  });
  const [lastGlobalUpdate, setLastGlobalUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Request notification permission
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  // Save notification preference
  useEffect(() => {
    localStorage.setItem('realtime-notifications', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  // Fetch initial data counts
  const fetchDataCounts = useCallback(async () => {
    try {
      const promises = dataSources.map(async (source) => {
        const { count, error } = await supabase
          .from(source.table as any)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`Error fetching ${source.name}:`, error);
          return { ...source, status: 'error' as const };
        }
        
        return {
          ...source,
          recordCount: count || 0,
          lastUpdated: new Date(),
          status: 'online' as const
        };
      });

      const results = await Promise.all(promises);
      setDataSources(results);
      setLastGlobalUpdate(new Date());
      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching data counts:', error);
      setIsConnected(false);
      setDataSources(prev => prev.map(source => ({ ...source, status: 'error' as const })));
    }
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const channels = dataSources.map(source => {
      const channel = supabase
        .channel(`realtime-${source.table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: source.table
          },
          (payload) => {
            console.log(`Real-time update for ${source.name}:`, payload);
            
            // Update the specific data source
            setDataSources(prev => prev.map(ds => 
              ds.id === source.id 
                ? { 
                    ...ds, 
                    lastUpdated: new Date(),
                    changesSince: (ds.changesSince || 0) + 1,
                    status: 'online' as const
                  }
                : ds
            ));

            setLastGlobalUpdate(new Date());
            setIsConnected(true);

            // Show notification if enabled
            if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
              const eventType = payload.eventType;
              const title = `${source.name} Updated`;
              const body = `New ${eventType} event detected`;
              
              new Notification(title, {
                body,
                icon: '/favicon.ico',
                tag: source.id,
                requireInteraction: false
              });
            }

            // Show toast notification
            const changeType = payload.eventType === 'INSERT' ? 'added' : 
                              payload.eventType === 'UPDATE' ? 'updated' : 'deleted';
            
            toast.success(`${source.name}: Record ${changeType}`, {
              duration: 3000,
              icon: '🔄'
            });

            // Trigger callback
            onDataUpdate?.(source.id, payload);
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for ${source.name}:`, status);
          if (status === 'SUBSCRIBED') {
            setDataSources(prev => prev.map(ds => 
              ds.id === source.id ? { ...ds, status: 'online' as const } : ds
            ));
          } else if (status === 'CHANNEL_ERROR') {
            setDataSources(prev => prev.map(ds => 
              ds.id === source.id ? { ...ds, status: 'error' as const } : ds
            ));
          }
        });

      return channel;
    });

    // Cleanup subscriptions
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [dataSources, notificationsEnabled, onDataUpdate]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchDataCounts, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDataCounts]);

  // Initial fetch
  useEffect(() => {
    fetchDataCounts();
  }, []);

  const handleManualRefresh = async () => {
    await fetchDataCounts();
    toast.success('Data refreshed successfully');
  };

  const getStatusIcon = (status: DataSource['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-muted-foreground" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: DataSource['status']) => {
    switch (status) {
      case 'online':
        return 'bg-success';
      case 'offline':
        return 'bg-muted-foreground';
      case 'error':
        return 'bg-destructive';
    }
  };

  const onlineCount = dataSources.filter(ds => ds.status === 'online').length;
  const totalCount = dataSources.length;

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
              {onlineCount}/{totalCount} Online
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className="h-8 w-8 p-0"
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Global Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-success" />
            ) : (
              <WifiOff className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-muted-foreground">
                Last updated {formatDistanceToNow(lastGlobalUpdate, { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Auto-refresh: {autoRefresh ? `${refreshInterval / 1000}s` : 'Off'}
            </span>
          </div>
        </div>

        {/* Data Sources */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Sources
          </h4>
          {dataSources.map(source => (
            <div key={source.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {getStatusIcon(source.status)}
                  <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(source.status)}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{source.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.recordCount} records • Updated {formatDistanceToNow(source.lastUpdated, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {source.changesSince !== undefined && source.changesSince > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    +{source.changesSince}
                  </Badge>
                )}
                {source.changesSince !== undefined && source.changesSince > 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <div className="w-4 h-4" />
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Settings</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Push Notifications</span>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Auto Refresh</span>
            </div>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          {autoRefresh && (
            <div className="flex items-center justify-between pl-6">
              <span className="text-sm text-muted-foreground">Interval</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
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