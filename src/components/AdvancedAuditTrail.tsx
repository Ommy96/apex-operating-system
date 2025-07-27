import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  User, 
  Calendar, 
  Database, 
  Shield, 
  Eye, 
  Filter,
  Download,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string;
  old_values?: any;
  new_values?: any;
  user_agent?: string;
  ip_address?: string;
  metadata?: any;
  created_at: string;
}

interface AdvancedAuditTrailProps {
  userRole: string;
}

export function AdvancedAuditTrail({ userRole }: AdvancedAuditTrailProps) {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    event_type: '',
    entity_type: '',
    user_id: '',
    start_date: '',
    end_date: '',
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchAuditLogs();
    setupRealtimeSubscription();
  }, [userRole, filters]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('audit-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs'
        },
        () => {
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAuditLogs = async () => {
    if (userRole !== 'admin') return;

    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];
      
      // Apply search filter client-side for metadata
      if (filters.search) {
        filteredData = filteredData.filter(log => 
          JSON.stringify(log).toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setAuditLogs(filteredData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLogs = async () => {
    try {
      const csvContent = [
        // CSV Header
        'Timestamp,Event Type,Entity Type,Entity ID,User ID,IP Address,User Agent,Changes',
        // CSV Rows
        ...auditLogs.map(log => [
          new Date(log.created_at).toISOString(),
          log.event_type,
          log.entity_type,
          log.entity_id || '',
          log.user_id || '',
          log.ip_address || '',
          log.user_agent || '',
          JSON.stringify({
            old_values: log.old_values,
            new_values: log.new_values,
            metadata: log.metadata
          }).replace(/"/g, '""') // Escape quotes in CSV
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Audit logs exported successfully",
      });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to export audit logs",
        variant: "destructive",
      });
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'updated': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'deleted': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'role_change': return <Shield className="h-4 w-4 text-orange-500" />;
      case 'login': return <User className="h-4 w-4 text-purple-500" />;
      case 'approval_request_created': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'created': return 'default';
      case 'updated': return 'secondary';
      case 'deleted': return 'destructive';
      case 'role_change': return 'outline';
      default: return 'secondary';
    }
  };

  const getSecurityLevel = (log: AuditLog) => {
    const criticalEvents = ['role_change', 'deleted', 'admin_action'];
    const sensitiveEntities = ['profiles', 'users', 'permissions'];
    
    if (criticalEvents.includes(log.event_type) || sensitiveEntities.includes(log.entity_type)) {
      return 'high';
    } else if (log.event_type === 'updated') {
      return 'medium';
    }
    return 'low';
  };

  const getSecurityBadge = (level: string) => {
    switch (level) {
      case 'high': return <Badge variant="destructive">High Risk</Badge>;
      case 'medium': return <Badge variant="default">Medium Risk</Badge>;
      case 'low': return <Badge variant="secondary">Low Risk</Badge>;
      default: return null;
    }
  };

  if (userRole !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Access Denied
          </CardTitle>
          <CardDescription>
            Only administrators can access the advanced audit trail.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Advanced Audit Trail</h2>
          <p className="text-muted-foreground">Comprehensive system activity monitoring</p>
        </div>
        <Button onClick={exportAuditLogs} disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Select value={filters.event_type} onValueChange={(value) => setFilters({...filters, event_type: value === 'all' ? '' : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="role_change">Role Change</SelectItem>
                  <SelectItem value="approval_request_created">Approval Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filters.entity_type} onValueChange={(value) => setFilters({...filters, entity_type: value === 'all' ? '' : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="profiles">Profiles</SelectItem>
                  <SelectItem value="children">Children</SelectItem>
                  <SelectItem value="programs">Programs</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="approval_requests">Approval Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                placeholder="Start Date"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                placeholder="End Date"
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                placeholder="Search all fields..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="details">Detailed View</TabsTrigger>
          <TabsTrigger value="security">Security Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="text-center py-8">
                <p>Loading audit logs...</p>
              </CardContent>
            </Card>
          ) : auditLogs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No audit logs found</p>
              </CardContent>
            </Card>
          ) : (
            auditLogs.map((log) => (
              <Card key={log.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedLog(log)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getEventIcon(log.event_type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.event_type}</span>
                          <Badge variant={getEventBadgeVariant(log.event_type)}>
                            {log.entity_type}
                          </Badge>
                          {getSecurityBadge(getSecurityLevel(log))}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                          {log.user_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              User: {log.user_id.slice(0, 8)}
                            </span>
                          )}
                          {log.ip_address && (
                            <span>IP: {log.ip_address}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedLog ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getEventIcon(selectedLog.event_type)}
                  Audit Log Details
                </CardTitle>
                <CardDescription>
                  Complete information for audit log {selectedLog.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Event Type:</strong> {selectedLog.event_type}
                  </div>
                  <div>
                    <strong>Entity Type:</strong> {selectedLog.entity_type}
                  </div>
                  <div>
                    <strong>Entity ID:</strong> {selectedLog.entity_id || 'N/A'}
                  </div>
                  <div>
                    <strong>User ID:</strong> {selectedLog.user_id || 'System'}
                  </div>
                  <div>
                    <strong>IP Address:</strong> {selectedLog.ip_address || 'N/A'}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date(selectedLog.created_at).toLocaleString()}
                  </div>
                </div>

                {selectedLog.old_values && (
                  <div>
                    <strong>Previous Values:</strong>
                    <pre className="bg-muted p-3 rounded mt-2 text-sm overflow-auto">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <strong>New Values:</strong>
                    <pre className="bg-muted p-3 rounded mt-2 text-sm overflow-auto">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <strong>Metadata:</strong>
                    <pre className="bg-muted p-3 rounded mt-2 text-sm overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <strong>User Agent:</strong>
                    <p className="text-sm text-muted-foreground mt-1">{selectedLog.user_agent}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Select an audit log to view details</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">High Risk Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {auditLogs.filter(log => getSecurityLevel(log) === 'high').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Medium Risk Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {auditLogs.filter(log => getSecurityLevel(log) === 'medium').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Role Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {auditLogs.filter(log => log.event_type === 'role_change').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent High-Risk Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs
                  .filter(log => getSecurityLevel(log) === 'high')
                  .slice(0, 5)
                  .map(log => (
                    <div key={log.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{log.event_type}</span>
                        <span className="text-sm text-muted-foreground">on {log.entity_type}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}