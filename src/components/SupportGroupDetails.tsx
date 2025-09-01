import { useState } from "react";
import { Plus, Edit, Trash2, Calendar, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ActivityForm } from "@/components/ActivityForm";

interface SupportGroupDetailsProps {
  groupId: string;
  onClose: () => void;
}

export function SupportGroupDetails({ groupId, onClose }: SupportGroupDetailsProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);

  const { data: group } = useQuery({
    queryKey: ['support-group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ['support-group-activities', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_group_activities')
        .select('*')
        .eq('support_group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('support_group_activities')
        .delete()
        .eq('id', activityId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-group-activities', groupId] });
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    },
  });

  const handleActivitySuccess = () => {
    setIsActivityDialogOpen(false);
    setEditingActivity(null);
    queryClient.invalidateQueries({ queryKey: ['support-group-activities', groupId] });
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setIsActivityDialogOpen(true);
  };

  const handleDeleteActivity = (activityId: string) => {
    deleteActivityMutation.mutate(activityId);
  };

  if (!group) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{group.name}</h2>
          <p className="text-muted-foreground">Support Group Details</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setIsActivityDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        )}
      </div>

      {/* Group Information */}
      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>Name:</strong> {group.name}
          </div>
          <div>
            <strong>Members:</strong> {group.member_count || 0}
          </div>
          <div>
            <strong>Team Leader:</strong> {group.facilitator || 'Not assigned'}
          </div>
          <div>
            <strong>Contact:</strong> {group.team_leader_contact || 'Not provided'}
          </div>
          <div>
            <strong>Location:</strong> {group.location || 'Not specified'}
          </div>
          <div>
            <strong>Schedule:</strong> {group.meeting_schedule || 'Not specified'}
          </div>
          {group.description && (
            <div className="md:col-span-2">
              <strong>Description:</strong> {group.description}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activities
            <Badge variant="secondary">{activities?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold">{activity.activity_name}</h4>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {activity.frequency && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activity.frequency}
                            </div>
                          )}
                          {activity.notes && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Notes available
                            </div>
                          )}
                        </div>
                        {activity.notes && (
                          <div className="text-sm bg-muted p-2 rounded">
                            <strong>Notes:</strong> {activity.notes}
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditActivity(activity)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{activity.activity_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteActivity(activity.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities recorded yet.</p>
              {isAdmin && (
                <p className="text-sm">Click "Add Activity" to get started.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Form Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </DialogTitle>
          </DialogHeader>
          <ActivityForm
            supportGroupId={groupId}
            activity={editingActivity}
            onSuccess={handleActivitySuccess}
            onCancel={() => {
              setIsActivityDialogOpen(false);
              setEditingActivity(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}