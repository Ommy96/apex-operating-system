import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, RefreshCw, Calendar, User, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ReplacementForm } from '@/components/ReplacementForm';

interface StatusReplacementCardProps {
  child: any;
  replacement: any;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function StatusReplacementCard({ child, replacement, isAdmin, onRefresh }: StatusReplacementCardProps) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isReplacementDialogOpen, setIsReplacementDialogOpen] = useState(false);
  const [status, setStatus] = useState(child.status || 'active');
  const [inactiveReason, setInactiveReason] = useState(child.inactive_reason || '');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setIsStatusDialogOpen(false);
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

  const handleDeleteReplacement = async () => {
    if (!replacement) return;
    
    setDeleteLoading(true);
    try {
      // Delete the replacement record
      const { error: deleteError } = await supabase
        .from('replacements')
        .delete()
        .eq('id', replacement.id);

      if (deleteError) throw deleteError;

      // Reset the child's replacement_status back to 'active'
      const { error: updateError } = await supabase
        .from('children')
        .update({ replacement_status: 'active' })
        .eq('id', child.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Replacement record deleted successfully",
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting replacement:', error);
      toast({
        title: "Error",
        description: "Failed to delete replacement",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReplacementSuccess = () => {
    setIsReplacementDialogOpen(false);
    onRefresh();
  };

  // Check if child can be replaced (active and not already replaced)
  const canBeReplaced = child.status === 'active' && child.replacement_status !== 'replaced' && !replacement;

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-secondary/20">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Status & Replacement
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {/* Add Replacement Button */}
              {canBeReplaced && (
                <Dialog open={isReplacementDialogOpen} onOpenChange={setIsReplacementDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <Plus className="h-3 w-3" />
                      Add Replacement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Replacement</DialogTitle>
                      <DialogDescription>
                        Replace {child.first_name} {child.last_name} with a new child
                      </DialogDescription>
                    </DialogHeader>
                    <ReplacementForm
                      preselectedChildId={child.id}
                      onSuccess={handleReplacementSuccess}
                      onCancel={() => setIsReplacementDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
              
              {/* Update Status Button */}
              <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
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
            </div>
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

        {/* Replacement Status */}
        {child.replacement_status && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Replacement Status</span>
            </div>
            <Badge 
              variant={child.replacement_status === 'replaced' ? 'destructive' : 'secondary'}
            >
              {child.replacement_status?.charAt(0).toUpperCase() + child.replacement_status?.slice(1)}
            </Badge>
          </div>
        )}

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
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Replacement Info</span>
              </div>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Replacement?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the replacement record for {child.first_name} {child.last_name} and reset their replacement status. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteReplacement}
                        disabled={deleteLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteLoading ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
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

        {/* No Replacement Recorded */}
        {!replacement && child.status === 'inactive' && (
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">No replacement recorded</p>
            {isAdmin && (
              <Dialog open={isReplacementDialogOpen} onOpenChange={setIsReplacementDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" size="sm" className="mt-1 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Replacement Now
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Replacement</DialogTitle>
                    <DialogDescription>
                      Replace {child.first_name} {child.last_name} with a new child
                    </DialogDescription>
                  </DialogHeader>
                  <ReplacementForm
                    preselectedChildId={child.id}
                    onSuccess={handleReplacementSuccess}
                    onCancel={() => setIsReplacementDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
