import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, RefreshCw, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StatusReplacementCardProps {
  child: any;
  replacement: any;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function StatusReplacementCard({ child, replacement, isAdmin, onRefresh }: StatusReplacementCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [status, setStatus] = useState(child.status || 'active');
  const [inactiveReason, setInactiveReason] = useState(child.inactive_reason || '');
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        status,
        inactive_reason: status === 'inactive' ? inactiveReason : null,
        inactive_date: status === 'inactive' ? new Date().toISOString().split('T')[0] : null,
      };

      const { error } = await supabase
        .from('children')
        .update(updateData)
        .eq('id', child.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Child status updated successfully",
      });
      setIsDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-secondary/20">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Status & Replacement
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Child Status</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {status === 'inactive' && (
                    <div className="space-y-2">
                      <Label>Reason for Inactivity</Label>
                      <Textarea
                        value={inactiveReason}
                        onChange={(e) => setInactiveReason(e.target.value)}
                        placeholder="Enter reason for marking as inactive..."
                        rows={3}
                      />
                    </div>
                  )}

                  <Button 
                    onClick={handleStatusUpdate} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
          <div className="flex items-center gap-2">
            {child.status === 'active' ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
            <span className="font-medium">Current Status</span>
          </div>
          <Badge 
            className={`${
              child.status === 'active' 
                ? 'bg-success/90 text-success-foreground' 
                : 'bg-warning/90 text-warning-foreground'
            }`}
          >
            {child.status?.charAt(0).toUpperCase() + child.status?.slice(1)}
          </Badge>
        </div>

        {/* Inactive Details */}
        {child.status === 'inactive' && (
          <>
            {child.inactive_date && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                <Calendar className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Inactive Since</p>
                  <p className="text-sm font-semibold">{new Date(child.inactive_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            {child.inactive_reason && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Reason</p>
                <p className="text-sm">{child.inactive_reason}</p>
              </div>
            )}
          </>
        )}

        {/* Replacement Info */}
        {replacement && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Replacement Info</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Replaced by: </span>
                  <span className="font-semibold">{replacement.new_child_full_name}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-semibold">{new Date(replacement.replacement_date).toLocaleDateString()}</span>
                </span>
              </div>
              {replacement.reason && (
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-medium">Reason: </span>{replacement.reason}
                </p>
              )}
            </div>
          </div>
        )}

        {!replacement && child.status === 'inactive' && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No replacement recorded
          </p>
        )}
      </CardContent>
    </Card>
  );
}
