import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, FileText, Activity, Calendar, User, Eye, Edit, Trash2, Download, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { ProgramReportForm } from "./ProgramReportForm";
import { ActivityReportForm } from "./ActivityReportForm";
import * as XLSX from 'xlsx';

interface ProgramReportsSectionProps {
  programName: string;
  programType: string;
}

export function ProgramReportsSection({ programName, programType }: ProgramReportsSectionProps) {
  const { toast } = useToast();
  const { isAdmin, isManagement } = useAuth();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState("program-reports");
  const [isAddProgramReportOpen, setIsAddProgramReportOpen] = useState(false);
  const [isAddActivityReportOpen, setIsAddActivityReportOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [editingReport, setEditingReport] = useState<any>(null);

  // Fetch program reports
  const { data: programReports = [], refetch: refetchProgramReports } = useQuery({
    queryKey: ['program-reports', programType, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('program_reports')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('program', programType as any)
        .order('reporting_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch activity reports
  const { data: activityReports = [], refetch: refetchActivityReports } = useQuery({
    queryKey: ['activity-reports', programType, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('activity_reports')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('program', programType as any)
        .order('reporting_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const handleDeleteProgramReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('program_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Report deleted successfully" });
      refetchProgramReports();
    } catch (error) {
      toast({ title: "Failed to delete report", variant: "destructive" });
    }
  };

  const handleDeleteActivityReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activity_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Activity report deleted successfully" });
      refetchActivityReports();
    } catch (error) {
      toast({ title: "Failed to delete report", variant: "destructive" });
    }
  };

  const downloadReports = (type: 'program' | 'activity') => {
    const data = type === 'program' ? programReports : activityReports;
    if (!data || data.length === 0) {
      toast({ title: "No data to download", variant: "destructive" });
      return;
    }

    const formattedData = data.map((report: any) => ({
      'Staff': report.staff,
      'Date': format(new Date(report.reporting_date), 'MMM d, yyyy'),
      'Executive Summary': report.executive_summary,
      'Beneficiary Impact': report.beneficiary_impact,
      'Challenges': report.challenges,
      'Recommendations': report.proposed_recommendations,
      'Created': format(new Date(report.created_at), 'MMM d, yyyy'),
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'program' ? 'Program Reports' : 'Activity Reports');
    XLSX.writeFile(wb, `${programName}_${type}_reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Reports exported successfully" });
  };

  const ReportCard = ({ report, type }: { report: any; type: 'program' | 'activity' }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {type === 'program' ? <FileText className="h-4 w-4 text-primary" /> : <Activity className="h-4 w-4 text-primary" />}
              {type === 'program' ? 'Monthly Report' : 'Activity Report'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(report.reporting_date), 'MMMM d, yyyy')}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <User className="h-3 w-3 mr-1" />
            {report.staff}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {report.executive_summary}
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewingReport({ ...report, type })}
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
                  setEditingReport({ ...report, type });
                  if (type === 'program') {
                    setIsAddProgramReportOpen(true);
                  } else {
                    setIsAddActivityReportOpen(true);
                  }
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
                    <AlertDialogTitle>Delete Report</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this report? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => type === 'program' ? handleDeleteProgramReport(report.id) : handleDeleteActivityReport(report.id)}
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
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-card/50">
            <TabsTrigger value="program-reports" className="flex items-center gap-2 data-[state=active]:bg-accent">
              <FileText className="h-4 w-4" />
              Monthly Reports
              <Badge variant="secondary" className="ml-1 text-xs">{programReports.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="activity-reports" className="flex items-center gap-2 data-[state=active]:bg-accent">
              <Activity className="h-4 w-4" />
              Activities
              <Badge variant="secondary" className="ml-1 text-xs">{activityReports.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            {(isAdmin || isManagement) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReports(activeTab === 'program-reports' ? 'program' : 'activity')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingReport(null);
                  if (activeTab === 'program-reports') {
                    setIsAddProgramReportOpen(true);
                  } else {
                    setIsAddActivityReportOpen(true);
                  }
                }}
                className="bg-gradient-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="program-reports" className="space-y-4">
          {programReports.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Monthly Reports Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start documenting program progress by adding your first monthly report.
                </p>
                {isAdmin && (
                  <Button onClick={() => setIsAddProgramReportOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Report
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programReports.map((report: any) => (
                <ReportCard key={report.id} report={report} type="program" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity-reports" className="space-y-4">
          {activityReports.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Activity Reports Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Log program activities to track outputs and outcomes.
                </p>
                {isAdmin && (
                  <Button onClick={() => setIsAddActivityReportOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Activity
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activityReports.map((report: any) => (
                <ReportCard key={report.id} report={report} type="activity" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Program Report Dialog */}
      <Dialog open={isAddProgramReportOpen} onOpenChange={(open) => {
        setIsAddProgramReportOpen(open);
        if (!open) setEditingReport(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'Edit Monthly Report' : 'Add Monthly Report'}
            </DialogTitle>
          </DialogHeader>
          <ProgramReportForm
            programType={programType}
            report={editingReport}
            onSuccess={() => {
              setIsAddProgramReportOpen(false);
              setEditingReport(null);
              refetchProgramReports();
            }}
            onCancel={() => {
              setIsAddProgramReportOpen(false);
              setEditingReport(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add/Edit Activity Report Dialog */}
      <Dialog open={isAddActivityReportOpen} onOpenChange={(open) => {
        setIsAddActivityReportOpen(open);
        if (!open) setEditingReport(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'Edit Activity Report' : 'Add Activity Report'}
            </DialogTitle>
          </DialogHeader>
          <ActivityReportForm
            programType={programType}
            report={editingReport}
            onSuccess={() => {
              setIsAddActivityReportOpen(false);
              setEditingReport(null);
              refetchActivityReports();
            }}
            onCancel={() => {
              setIsAddActivityReportOpen(false);
              setEditingReport(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingReport?.type === 'program' ? (
                <FileText className="h-5 w-5 text-primary" />
              ) : (
                <Activity className="h-5 w-5 text-primary" />
              )}
              {viewingReport?.type === 'program' ? 'Monthly Report' : 'Activity Report'} Details
            </DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Header Info */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Staff</p>
                          <p className="font-medium">{viewingReport.staff}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Report Date</p>
                          <p className="font-medium">{format(new Date(viewingReport.reporting_date), 'MMMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Report Content */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Executive Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingReport.executive_summary}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Beneficiary Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingReport.beneficiary_impact}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Challenges</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingReport.challenges}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Proposed Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{viewingReport.proposed_recommendations}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                  <Clock className="h-3 w-3" />
                  Created: {format(new Date(viewingReport.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
