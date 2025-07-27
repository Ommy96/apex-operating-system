import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertTriangle, User, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ApprovalRequest {
  id: string;
  request_type: string;
  requester_id: string;
  approver_id?: string;
  target_entity_type: string;
  target_entity_id: string;
  requested_changes: any;
  current_values: any;
  status: string;
  priority: string;
  reason?: string;
  reviewer_comments?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
}

interface ApprovalWorkflowProps {
  userRole: string;
}

export function ApprovalWorkflow({ userRole }: ApprovalWorkflowProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    request_type: '',
    target_entity_type: '',
    target_entity_id: '',
    requested_changes: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    reason: ''
  });

  useEffect(() => {
    fetchApprovalRequests();
    setupRealtimeSubscription();
  }, [userRole]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('approval-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_requests'
        },
        () => {
          fetchApprovalRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchApprovalRequests = async () => {
    try {
      let query = supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, only show user's own requests
      if (userRole !== 'admin') {
        query = query.eq('requester_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch approval requests",
        variant: "destructive",
      });
    }
  };

  const createApprovalRequest = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('approval_requests')
        .insert({
          request_type: newRequest.request_type,
          requester_id: user.id,
          target_entity_type: newRequest.target_entity_type,
          target_entity_id: newRequest.target_entity_id,
          requested_changes: JSON.parse(newRequest.requested_changes || '{}'),
          current_values: {},
          priority: newRequest.priority,
          reason: newRequest.reason
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Approval request created successfully",
      });

      setShowCreateForm(false);
      setNewRequest({
        request_type: '',
        target_entity_type: '',
        target_entity_id: '',
        requested_changes: '',
        priority: 'normal',
        reason: ''
      });
    } catch (error: any) {
      console.error('Error creating approval request:', error);
      toast({
        title: "Error",
        description: `Failed to create approval request: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (requestId: string, action: 'approved' | 'rejected', comments: string = '') => {
    if (userRole !== 'admin') {
      toast({
        title: "Permission Denied",
        description: "Only administrators can approve or reject requests",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        status: action,
        approver_id: user?.id,
        reviewer_comments: comments
      };

      if (action === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('approval_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Request ${action} successfully`,
      });
    } catch (error: any) {
      console.error(`Error ${action} request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} request: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      default: return 'outline';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Approval Workflow</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create Request'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Approval Request</CardTitle>
            <CardDescription>Submit a request for approval from administrators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="request_type">Request Type</Label>
                <Input
                  id="request_type"
                  value={newRequest.request_type}
                  onChange={(e) => setNewRequest({ ...newRequest, request_type: e.target.value })}
                  placeholder="e.g., role_change, data_modification"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newRequest.priority} onValueChange={(value: any) => setNewRequest({ ...newRequest, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_entity_type">Target Entity Type</Label>
                <Input
                  id="target_entity_type"
                  value={newRequest.target_entity_type}
                  onChange={(e) => setNewRequest({ ...newRequest, target_entity_type: e.target.value })}
                  placeholder="e.g., user_profile, program"
                />
              </div>
              <div>
                <Label htmlFor="target_entity_id">Target Entity ID</Label>
                <Input
                  id="target_entity_id"
                  value={newRequest.target_entity_id}
                  onChange={(e) => setNewRequest({ ...newRequest, target_entity_id: e.target.value })}
                  placeholder="UUID of the target entity"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="requested_changes">Requested Changes (JSON)</Label>
              <Textarea
                id="requested_changes"
                value={newRequest.requested_changes}
                onChange={(e) => setNewRequest({ ...newRequest, requested_changes: e.target.value })}
                placeholder='{"field": "new_value"}'
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={newRequest.reason}
                onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                placeholder="Explain why this change is needed"
                rows={2}
              />
            </div>
            <Button onClick={createApprovalRequest} disabled={loading}>
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No approval requests found</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className={`${isExpired(request.expires_at) && request.status === 'pending' ? 'border-red-200 bg-red-50/30' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      {request.request_type}
                      {isExpired(request.expires_at) && request.status === 'pending' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Request ID: {request.id.slice(0, 8)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusVariant(request.status)}>
                      {request.status}
                    </Badge>
                    <Badge variant={getPriorityVariant(request.priority)}>
                      {request.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Target Entity</Label>
                    <p className="text-sm text-muted-foreground">{request.target_entity_type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Expires</Label>
                    <p className={`text-sm ${isExpired(request.expires_at) ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {new Date(request.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {request.reason && (
                  <div>
                    <Label className="text-sm font-medium">Reason</Label>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                )}

                {request.requested_changes && Object.keys(request.requested_changes).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Requested Changes</Label>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(request.requested_changes, null, 2)}
                    </pre>
                  </div>
                )}

                {request.reviewer_comments && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Reviewer Comments
                    </Label>
                    <p className="text-sm text-muted-foreground">{request.reviewer_comments}</p>
                  </div>
                )}

                {userRole === 'admin' && request.status === 'pending' && !isExpired(request.expires_at) && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleApprovalAction(request.id, 'approved', 'Approved by admin')}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApprovalAction(request.id, 'rejected', 'Rejected by admin')}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}