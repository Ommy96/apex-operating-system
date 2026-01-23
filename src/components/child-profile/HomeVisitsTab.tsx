import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Plus, Calendar, User, MapPin, Eye, Edit, Trash2, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { HomeVisitReportForm } from '@/components/HomeVisitReportForm';

interface HomeVisitsTabProps {
  childId: string;
  isAdmin: boolean;
}

export function HomeVisitsTab({ childId, isAdmin }: HomeVisitsTabProps) {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [viewingReport, setViewingReport] = useState<any>(null);

  // Fetch home visit reports for this child
  const { data: homeVisits = [], isLoading } = useQuery({
    queryKey: ['child-home-visits', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_visit_reports')
        .select('*')
        .eq('student_id', childId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!childId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('home_visit_reports')
        .delete()
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-home-visits', childId] });
      toast({ title: "Success", description: "Report deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete report", variant: "destructive" });
    },
  });

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingReport(null);
    queryClient.invalidateQueries({ queryKey: ['child-home-visits', childId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold">Home Visit Reports</h3>
          <p className="text-muted-foreground text-sm">{homeVisits.length} visit{homeVisits.length !== 1 ? 's' : ''} recorded</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-accent to-accent-dark text-accent-foreground shadow-lg hover:shadow-xl transition-shadow">
                <Plus className="h-4 w-4 mr-2" />
                Add Home Visit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Home Visit</DialogTitle>
              </DialogHeader>
              <HomeVisitReportForm
                onSuccess={handleFormSuccess}
                onCancel={() => setIsCreateDialogOpen(false)}
                preselectedChildId={childId}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {homeVisits.length === 0 ? (
        <Card className="border-dashed border-2 bg-secondary/20">
          <CardContent className="text-center py-12">
            <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No home visits recorded</p>
            <p className="text-sm text-muted-foreground/70">Add a home visit report to track visits</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {homeVisits.map((visit, index) => {
            const colors = [
              'from-blue-500/10 to-cyan-500/10 border-blue-200',
              'from-emerald-500/10 to-green-500/10 border-emerald-200',
              'from-purple-500/10 to-pink-500/10 border-purple-200',
              'from-orange-500/10 to-amber-500/10 border-orange-200',
            ];
            const colorClass = colors[index % colors.length];

            return (
              <Card key={visit.id} className={`border bg-gradient-to-r ${colorClass} shadow-md hover:shadow-lg transition-all`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Home className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Home Visit
                          <Badge variant="outline" className="text-xs">
                            {new Date(visit.visit_date).toLocaleDateString()}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {visit.staff}
                          </span>
                          {visit.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {visit.location}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingReport(visit)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingReport(visit)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this home visit report? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(visit.id)}
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
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {visit.reason_for_visit && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      <span className="font-medium">Reason: </span>{visit.reason_for_visit}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Report Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Home Visit Report
            </DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground uppercase">Visit Date</p>
                    <p className="font-medium">{new Date(viewingReport.visit_date).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground uppercase">Staff</p>
                    <p className="font-medium">{viewingReport.staff}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground uppercase">Location</p>
                    <p className="font-medium">{viewingReport.location || 'Not specified'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground uppercase">Reason for Visit</p>
                    <p className="font-medium">{viewingReport.reason_for_visit || 'Not specified'}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-secondary/30 border">
                  <p className="text-sm font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observation Findings
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{viewingReport.observation_findings}</p>
                </div>

                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Challenges Identified
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{viewingReport.challenges_identified}</p>
                </div>

                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-sm font-medium text-muted-foreground uppercase mb-2">
                    Recommendations
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{viewingReport.recommendations}</p>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={!!editingReport} onOpenChange={() => setEditingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Home Visit Report</DialogTitle>
          </DialogHeader>
          {editingReport && (
            <HomeVisitReportForm
              initialData={editingReport}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingReport(null)}
              preselectedChildId={childId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
