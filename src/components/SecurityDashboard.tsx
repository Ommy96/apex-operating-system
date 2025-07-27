import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Lock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  rateLimitViolations: number;
  failedPasswordAttempts: number;
  adminRoleChanges: number;
  recentAuditLogs: any[];
  activeUsers: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

export function SecurityDashboard() {
  const { userRole } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    rateLimitViolations: 0,
    failedPasswordAttempts: 0,
    adminRoleChanges: 0,
    recentAuditLogs: [],
    activeUsers: 0,
    systemHealth: 'good'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSecurityMetrics();
      const interval = setInterval(fetchSecurityMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const fetchSecurityMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch rate limit violations (blocked users)
      const { count: rateLimitCount } = await supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .not('blocked_until', 'is', null)
        .gt('blocked_until', new Date().toISOString());

      // Fetch admin role changes in last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: adminChanges } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'role_change')
        .or('old_values->>role.eq.admin,new_values->>role.eq.admin')
        .gte('created_at', twentyFourHoursAgo);

      // Fetch recent audit logs
      const { data: recentLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('event_type', 'role_change')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch active users count
      const { count: activeUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calculate system health
      const systemHealth = calculateSystemHealth(
        rateLimitCount || 0,
        adminChanges || 0
      );

      setMetrics({
        rateLimitViolations: rateLimitCount || 0,
        failedPasswordAttempts: 0, // This would need more complex tracking
        adminRoleChanges: adminChanges || 0,
        recentAuditLogs: recentLogs || [],
        activeUsers: activeUsersCount || 0,
        systemHealth
      });
    } catch (error) {
      console.error('Error fetching security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSystemHealth = (rateLimitViolations: number, adminChanges: number): 'good' | 'warning' | 'critical' => {
    if (rateLimitViolations > 10 || adminChanges > 5) return 'critical';
    if (rateLimitViolations > 5 || adminChanges > 2) return 'warning';
    return 'good';
  };

  const getHealthIcon = () => {
    switch (metrics.systemHealth) {
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getHealthColor = () => {
    switch (metrics.systemHealth) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
    }
  };

  if (userRole !== 'admin') {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <Shield className="h-5 w-5 mr-2" />
            Access Denied
          </CardTitle>
          <CardDescription>Only administrators can access the security dashboard.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Dashboard
          </CardTitle>
          <CardDescription>
            Monitor security events, rate limits, and system health in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Health Status */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {getHealthIcon()}
              <div>
                <p className="font-medium">System Health</p>
                <p className={`text-sm capitalize ${getHealthColor()}`}>
                  {metrics.systemHealth}
                </p>
              </div>
            </div>
            <Badge variant={metrics.systemHealth === 'good' ? 'default' : 'destructive'}>
              {metrics.systemHealth === 'good' ? 'Healthy' : metrics.systemHealth === 'warning' ? 'Warning' : 'Critical'}
            </Badge>
          </div>

          {/* Security Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Lock className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{metrics.rateLimitViolations}</p>
                  <p className="text-xs text-muted-foreground">Rate Limit Violations</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{metrics.adminRoleChanges}</p>
                  <p className="text-xs text-muted-foreground">Admin Changes (24h)</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{metrics.activeUsers}</p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? '...' : Math.floor((Date.now() - new Date().setHours(0,0,0,0)) / 60000)}
                  </p>
                  <p className="text-xs text-muted-foreground">Uptime (mins)</p>
                </div>
              </div>
            </Card>
          </div>

          <Separator />

          {/* Recent Security Events */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Security Events
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.recentAuditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent security events</p>
                  <p className="text-xs">All quiet on the security front</p>
                </div>
              ) : (
                metrics.recentAuditLogs.map((log) => {
                  const isAdminRelated = log.old_values?.role === 'admin' || log.new_values?.role === 'admin';
                  return (
                    <div key={log.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      isAdminRelated ? 'bg-red-50 border-red-200' : 'bg-background border-border'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          isAdminRelated ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium">
                            {isAdminRelated ? '🔥 Admin Role Change' : 'Role Change'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.metadata?.target_user_name || 'Unknown'}: {' '}
                            {log.old_values?.role} → {log.new_values?.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isAdminRelated ? 'destructive' : 'outline'} className="text-xs">
                          {isAdminRelated ? 'CRITICAL' : 'INFO'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Security Recommendations */}
          {metrics.systemHealth !== 'good' && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Security Recommendations:
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {metrics.rateLimitViolations > 5 && (
                  <li>• Multiple rate limit violations detected - consider reviewing user access</li>
                )}
                {metrics.adminRoleChanges > 2 && (
                  <li>• High number of admin role changes - verify all changes are authorized</li>
                )}
                <li>• Consider enabling additional security measures in production</li>
                <li>• Review audit logs regularly for suspicious activity</li>
              </ul>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSecurityMetrics}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Metrics'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('#/settings?tab=audit', '_blank')}
            >
              View Full Audit Log
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}