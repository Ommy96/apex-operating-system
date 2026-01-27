import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Home, Calendar, User, Eye, Edit, Trash2, MapPin, AlertCircle, CheckCircle2, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { HomeVisitForm } from "./HomeVisitForm";
import * as XLSX from 'xlsx';

interface HomeVisitsTabProps {
  beneficiaryId?: string;
  beneficiaryName?: string;
  programContext?: string;
}

export function HomeVisitsTab({ beneficiaryId, beneficiaryName, programContext }: HomeVisitsTabProps) {
  const { toast } = useToast();
  const { isAdmin, isManagement } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingVisit, setViewingVisit] = useState<any>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);

  const { data: homeVisits = [], refetch } = useQuery({
    queryKey: ['home-visits', beneficiaryId, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      let query = supabase
        .from('home_visit_reports')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .order('visit_date', { ascending: false });
      
      if (beneficiaryId) {
        query = query.eq('student_id', beneficiaryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('home_visit_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Visit report deleted successfully" });
      refetch();
    } catch (error) {
      toast({ title: "Failed to delete visit report", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!homeVisits || homeVisits.length === 0) {
      toast({ title: "No data to download", variant: "destructive" });
      return;
    }

    const formattedData = homeVisits.map((visit: any) => ({
      'Staff': visit.staff,
      'Visit Date': format(new Date(visit.visit_date), 'MMM d, yyyy'),
      'Location': visit.location || 'N/A',
      'Reason for Visit': visit.reason_for_visit || 'N/A',
      'Observation Findings': visit.observation_findings,
      'Challenges Identified': visit.challenges_identified,
      'Recommendations': visit.recommendations,
      'Created': format(new Date(visit.created_at), 'MMM d, yyyy'),
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Home Visits');
    XLSX.writeFile(wb, `home_visits_${beneficiaryName || programContext || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Home visits exported successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Home Visits
          </h3>
          <p className="text-sm text-muted-foreground">
            {beneficiaryName ? `Visit history for ${beneficiaryName}` : `All home visit reports${programContext ? ` for ${programContext}` : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isManagement) && homeVisits.length > 0 && (
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
              Record Visit
            </Button>
          )}
        </div>
      </div>

      {homeVisits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Home Visits Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start documenting home visits to track progress and support.
            </p>
            {isAdmin && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Visit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homeVisits.map((visit: any) => (
            <Card key={visit.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Home className="h-4 w-4 text-primary" />
                      Home Visit
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(visit.visit_date), 'MMMM d, yyyy')}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {visit.staff}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visit.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{visit.location}</span>
                  </div>
                )}
                {visit.reason_for_visit && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Reason:</span> {visit.reason_for_visit}
                  </p>
                )}
                <p className="text-sm line-clamp-2">
                  {visit.observation_findings}
                </p>
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
                            <AlertDialogTitle>Delete Visit Report</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this visit report? This action cannot be undone.
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
              {editingVisit ? 'Edit Home Visit' : 'Record Home Visit'}
            </DialogTitle>
          </DialogHeader>
          <HomeVisitForm
            beneficiaryId={beneficiaryId}
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
              <Home className="h-5 w-5 text-primary" />
              Home Visit Details
            </DialogTitle>
          </DialogHeader>
          {viewingVisit && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Staff</p>
                          <p className="font-medium">{viewingVisit.staff}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Visit Date</p>
                          <p className="font-medium">{format(new Date(viewingVisit.visit_date), 'MMMM d, yyyy')}</p>
                        </div>
                      </div>
                      {viewingVisit.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="font-medium">{viewingVisit.location}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {viewingVisit.reason_for_visit && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Reason for Visit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{viewingVisit.reason_for_visit}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Observation Findings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingVisit.observation_findings}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        Challenges Identified
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingVisit.challenges_identified}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingVisit.recommendations}</p>
                    </CardContent>
                  </Card>
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
