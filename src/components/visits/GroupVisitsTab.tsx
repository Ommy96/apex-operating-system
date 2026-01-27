import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Users, Calendar, Eye, Edit, Trash2, Clock, Download, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { GroupVisitForm } from "./GroupVisitForm";
import * as XLSX from 'xlsx';

interface GroupVisitsTabProps {
  groupId?: string;
  groupName?: string;
}

type GroupVisit = {
  id: string;
  activity_name: string;
  description?: string;
  frequency?: string;
  notes?: string;
  created_at: string;
};

export function GroupVisitsTab({ groupId, groupName }: GroupVisitsTabProps) {
  const { toast } = useToast();
  const { isAdmin, isManagement } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingVisit, setViewingVisit] = useState<GroupVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<GroupVisit | null>(null);

  const { data: groupVisits = [], refetch } = useQuery({
    queryKey: ['group-visits', groupId, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id || !groupId) return [];
      
      const { data, error } = await supabase
        .from('support_group_activities')
        .select('id, activity_name, description, frequency, notes, created_at')
        .eq('support_group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as GroupVisit[];
    },
    enabled: !!currentOrganization?.organization_id && !!groupId,
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('support_group_activities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Group visit deleted successfully" });
      refetch();
    } catch (error) {
      toast({ title: "Failed to delete visit", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!groupVisits || groupVisits.length === 0) {
      toast({ title: "No data to download", variant: "destructive" });
      return;
    }

    const formattedData = groupVisits.map((visit) => ({
      'Activity': visit.activity_name,
      'Description': visit.description || 'N/A',
      'Frequency': visit.frequency || 'N/A',
      'Notes': visit.notes || 'N/A',
      'Created': format(new Date(visit.created_at), 'MMM d, yyyy'),
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Group Visits');
    XLSX.writeFile(wb, `group_visits_${groupName || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Group visits exported successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Group Visits
          </h3>
          <p className="text-sm text-muted-foreground">
            {groupName ? `Activities for ${groupName}` : 'All group activities'}
          </p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isManagement) && groupVisits.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" onClick={() => {
              setEditingVisit(null);
              setIsAddDialogOpen(true);
            }} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          )}
        </div>
      </div>

      {groupVisits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Group Activities Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start documenting group activities and visits.
            </p>
            {isAdmin && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Activity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupVisits.map((visit) => (
            <Card key={visit.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      {visit.activity_name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(visit.created_at), 'MMMM d, yyyy')}
                    </div>
                  </div>
                  {visit.frequency && (
                    <Badge variant="outline" className="text-xs">
                      {visit.frequency}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visit.description && (
                  <p className="text-sm line-clamp-2">{visit.description}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingVisit(visit)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingVisit(visit);
                          setIsAddDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this activity? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(visit.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) setEditingVisit(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVisit ? 'Edit Activity' : 'Add Activity'}
            </DialogTitle>
          </DialogHeader>
          <GroupVisitForm
            groupId={groupId}
            visit={editingVisit}
            onSuccess={() => {
              setIsAddDialogOpen(false);
              setEditingVisit(null);
              refetch();
            }}
            onCancel={() => {
              setIsAddDialogOpen(false);
              setEditingVisit(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingVisit} onOpenChange={(open) => !open && setViewingVisit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Activity Details
            </DialogTitle>
          </DialogHeader>
          {viewingVisit && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Activity</p>
                          <p className="font-medium">{viewingVisit.activity_name}</p>
                        </div>
                      </div>
                      {viewingVisit.frequency && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Frequency</p>
                            <p className="font-medium">{viewingVisit.frequency}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {viewingVisit.description && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{viewingVisit.description}</p>
                      </CardContent>
                    </Card>
                  )}

                  {viewingVisit.notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{viewingVisit.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                  <Clock className="h-3 w-3" />
                  Created: {format(new Date(viewingVisit.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
