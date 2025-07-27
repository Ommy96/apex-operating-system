import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Users, 
  User, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';

export function RealtimeStatusDemo() {
  const { user, userRole, refreshUserRole, forceSessionRefresh } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const [lastRoleCheck, setLastRoleCheck] = useState<Date | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Test real-time connection
    const testChannel = supabase
      .channel('connection-test')
      .on('presence', { event: 'sync' }, () => {
        setConnectionStatus('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    // Listen for role changes globally (for demo purposes)
    const roleChangeChannel = supabase
      .channel('demo-role-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: 'event_type=eq.role_change'
        },
        (payload) => {
          const event = {
            id: Date.now(),
            type: 'role_change',
            timestamp: new Date(),
            data: payload.new
          };
          setRealtimeEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(testChannel);
      supabase.removeChannel(roleChangeChannel);
    };
  }, [user?.id]);

  const handleRefreshRole = async () => {
    setLastRoleCheck(new Date());
    await refreshUserRole();
  };

  const handleForceRefresh = async () => {
    await forceSessionRefresh();
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
    }
  };

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Connecting...';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'management':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'staff':
        return <User className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Real-time Session Management Demo
          </CardTitle>
          <CardDescription>
            Monitor live role changes, session refresh capabilities, and real-time notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {getConnectionIcon()}
              <div>
                <p className="font-medium">Real-time Connection</p>
                <p className="text-sm text-muted-foreground">{getConnectionStatus()}</p>
              </div>
            </div>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus}
            </Badge>
          </div>

          {/* Current User Info */}
          <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
            <div className="flex items-center gap-3">
              {getRoleIcon(userRole || 'staff')}
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-sm text-muted-foreground">
                  {user?.email} • Role: {userRole}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshRole}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Check Role
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleForceRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Force Refresh
              </Button>
            </div>
          </div>

          {lastRoleCheck && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Last role check: {lastRoleCheck.toLocaleTimeString()}
            </div>
          )}

          <Separator />

          {/* Live Events */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Live Role Change Events
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {realtimeEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No live events yet</p>
                  <p className="text-xs">Make a role change in Settings to see real-time updates</p>
                </div>
              ) : (
                realtimeEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-background border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="text-sm font-medium">Role Change Detected</p>
                        <p className="text-xs text-muted-foreground">
                          {event.data.metadata?.target_user_name || 'Unknown'}: {' '}
                          {event.data.old_values?.role} → {event.data.new_values?.role}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.timestamp.toLocaleTimeString()}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              🧪 Test Real-time Features:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Go to Settings → Role Assignment</li>
              <li>2. Change a user's role (including your own)</li>
              <li>3. Watch for instant notifications and session updates</li>
              <li>4. Open multiple browser tabs to test multi-session handling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}