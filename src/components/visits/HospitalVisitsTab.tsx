import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Hospital, Calendar, User, Eye, Edit, Trash2, Clock, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { HospitalVisitForm } from "./HospitalVisitForm";
import * as XLSX from 'xlsx';

interface HospitalVisitsTabProps {
  beneficiaryId?: string;
  beneficiaryName?: string;
}

export function HospitalVisitsTab({ beneficiaryId, beneficiaryName }: HospitalVisitsTabProps) {
  const { toast } = useToast();
  const { isAdmin, isManagement } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingVisit, setViewingVisit] = useState<any>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);

  const { data: hospitalVisits = [], refetch } = useQuery({
    queryKey: ['hospital-visits', beneficiaryId, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      let query = supabase
        .from('medical_records')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .order('date', { ascending: false });
      
      if (beneficiaryId) {
        query = query.eq('linked_child_id', beneficiaryId);
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
        .from('medical_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Hospital visit deleted successfully" });
      refetch();
    } catch (error) {
      toast({ title: "Failed to delete visit", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!hospitalVisits || hospitalVisits.length === 0) {
      toast({ title: "No data to download", variant: "destructive" });
      return;
    }

    const formattedData = hospitalVisits.map((visit: any) => ({
      'Date of Visit': visit.date ? format(new Date(visit.date), 'MMM d, yyyy') : 'N/A',
      'Medical Facility': visit.hospital,
      'Staff': visit.staff || 'N/A',
      'Notes': visit.doctors_report || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hospital Visits');
    XLSX.writeFile(wb, `hospital_visits_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Hospital visits exported successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Hospital className="h-5 w-5 text-primary" />
            Hospital Visits
          </h3>
          <p className="text-sm text-muted-foreground">
            {beneficiaryName ? `Hospital visits for ${beneficiaryName}` : 'All hospital visit records'}
          </p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isManagement) && hospitalVisits.length > 0 && (
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

      {hospitalVisits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Hospital className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Hospital Visits Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start documenting hospital visits to track medical care.
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
          {hospitalVisits.map((visit: any) => (
            <Card key={visit.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Hospital className="h-4 w-4 text-primary" />
                      {visit.hospital}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {visit.date ? format(new Date(visit.date), 'MMMM d, yyyy') : 'No date'}
                    </div>
                  </div>
                  {visit.staff && (
                    <Badge variant="outline" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      {visit.staff}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visit.doctors_report && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    <span className="font-medium">Notes:</span> {visit.doctors_report}
                  </p>
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
                            <AlertDialogTitle>Delete Hospital Visit</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this record? This action cannot be undone.
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVisit ? 'Edit Hospital Visit' : 'Record Hospital Visit'}
            </DialogTitle>
          </DialogHeader>
          <HospitalVisitForm
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hospital className="h-5 w-5 text-primary" />
              Hospital Visit Details
            </DialogTitle>
          </DialogHeader>
          {viewingVisit && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date of Visit</p>
                          <p className="font-medium">{viewingVisit.date ? format(new Date(viewingVisit.date), 'MMMM d, yyyy') : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hospital className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Medical Facility</p>
                          <p className="font-medium">{viewingVisit.hospital}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Staff</p>
                          <p className="font-medium">{viewingVisit.staff || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {viewingVisit.doctors_report && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingVisit.doctors_report}</p>
                    </CardContent>
                  </Card>
                )}

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
