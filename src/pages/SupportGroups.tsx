import { useState, useMemo } from "react";
import { Plus, Search, Users, Download, Eye, Edit, Trash2, MapPin, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SupportGroupForm } from "@/components/SupportGroupForm";
import { SupportGroupDetails } from "@/components/SupportGroupDetails";
import { SupportGroupEdit } from "@/components/SupportGroupEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatSupportGroupsData } from "@/lib/downloadUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function SupportGroups() {
  const { toast } = useToast();
  const { isAdmin, isManagement } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingGroup, setViewingGroup] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  const { data: supportGroups, refetch } = useQuery({
    queryKey: ['support-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredGroups = supportGroups?.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (group.facilitator && group.facilitator.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (group.team_leader_contact && group.team_leader_contact.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('support_groups')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-groups'] });
      toast({
        title: "Success",
        description: "Support group deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete support group",
        variant: "destructive",
      });
    },
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingGroup(null);
    refetch();
  };

  const handleView = (groupId: string) => {
    setViewingGroup(groupId);
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
  };

  const handleDelete = (groupId: string) => {
    deleteGroupMutation.mutate(groupId);
  };

  // Calculate statistics from filtered data
  const statistics = useMemo(() => {
    if (!filteredGroups) return null;

    const totalGroups = filteredGroups.length;
    const totalMembers = filteredGroups.reduce((sum, group) => sum + (group.member_count || 0), 0);
    const avgMembersPerGroup = totalGroups > 0 ? Math.round(totalMembers / totalGroups) : 0;
    const byLocation = filteredGroups.reduce((acc: any, group) => {
      if (group.location) {
        acc[group.location] = (acc[group.location] || 0) + 1;
      }
      return acc;
    }, {});
    const withSchedule = filteredGroups.filter(g => g.meeting_schedule).length;

    return { totalGroups, totalMembers, avgMembersPerGroup, byLocation, withSchedule };
  }, [filteredGroups]);

  const handleDownload = () => {
    if (!filteredGroups || filteredGroups.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no support groups to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatSupportGroupsData(filteredGroups);
    downloadExcel(formattedData, 'support_groups', 'Support Groups');
    
    toast({
      title: "Download started",
      description: "Your support groups are being downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Support Groups</h1>
          <p className="text-muted-foreground">Community support and group activities</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Support Group</DialogTitle>
            </DialogHeader>
            <SupportGroupForm
              onSuccess={handleSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{statistics.totalGroups}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.totalMembers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {statistics.avgMembersPerGroup} per group
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                By Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(statistics.byLocation).map(([location, count]: any) => (
                  <div key={location} className="flex justify-between text-sm">
                    <span>{location}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statistics.byLocation).length === 0 && (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border-muted/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                With Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.withSchedule}</div>
              <p className="text-xs text-muted-foreground mt-1">Have meeting schedule</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by group name or team leader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {isManagement && (
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups?.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{group.name}</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {group.member_count || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.description && (
                <div className="text-sm text-muted-foreground">
                  <strong>Description:</strong> {group.description}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <strong>Team Leader:</strong> {group.facilitator || 'Not assigned'}
              </div>
              {group.team_leader_contact && (
                <div className="text-sm text-muted-foreground">
                  <strong>Contact:</strong> {group.team_leader_contact}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <strong>Location:</strong> {group.location || 'Not specified'}
              </div>
              {group.meeting_schedule && (
                <div className="text-sm text-muted-foreground">
                  <strong>Schedule:</strong> {group.meeting_schedule}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(group.id)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(group)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Support Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{group.name}"? This will also delete all associated activities. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(group.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No support groups found.</p>
        </div>
      )}

      {/* View Group Details Dialog */}
      <Dialog open={!!viewingGroup} onOpenChange={() => setViewingGroup(null)}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Support Group Details</DialogTitle>
          </DialogHeader>
          {viewingGroup && (
            <SupportGroupDetails
              groupId={viewingGroup}
              onClose={() => setViewingGroup(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Support Group</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <SupportGroupEdit
              group={editingGroup}
              onSuccess={handleSuccess}
              onCancel={() => setEditingGroup(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}