import { useState } from "react";
import { Plus, Search, Calendar, FileText, Download, Activity, Users, TrendingUp, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProgramReportForm } from "@/components/ProgramReportForm";
import { downloadExcel, formatProgramReportsData } from "@/lib/downloadUtils";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export default function ProgramReports() {
  const { isManagement } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");

  const { data: programReports, refetch } = useQuery({
    queryKey: ['program-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_reports')
        .select('*')
        .order('reporting_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats for summary cards
  const { data: reportStats } = useQuery({
    queryKey: ['program-reports-stats'],
    queryFn: async () => {
      const totalReports = programReports?.length || 0;
      const thisMonth = programReports?.filter(report => {
        const reportDate = new Date(report.reporting_date);
        const now = new Date();
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }).length || 0;
      
      const programBreakdown = programReports?.reduce((acc, report) => {
        acc[report.program] = (acc[report.program] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const uniqueStaff = new Set(programReports?.map(r => r.staff) || []).size;
      const staffList = Array.from(new Set(programReports?.map(r => r.staff) || [])).sort();
      
      return { totalReports, thisMonth, programBreakdown, uniqueStaff, staffList };
    },
    enabled: !!programReports,
  });

  const filteredReports = programReports?.filter(report => {
    const matchesSearch = report.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.executive_summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = !programFilter || programFilter === 'all' || report.program === programFilter;
    const matchesStaff = !staffFilter || staffFilter === 'all' || report.staff === staffFilter;
    
    return matchesSearch && matchesProgram && matchesStaff;
  });

  const handleDownload = () => {
    if (!programReports || programReports.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no program reports to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatProgramReportsData(programReports);
    downloadExcel(formattedData, 'program_reports', 'Program Reports');
    
    toast({
      title: "Download started",
      description: "Your program reports are being downloaded.",
    });
  };

  const handleView = (report: any) => {
    setViewingReport(report);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (report: any) => {
    setEditingReport(report);
    setIsDialogOpen(true);
  };

  const handleDelete = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('program_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Program report deleted successfully",
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingReport(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Program Reports</h1>
          <p className="text-muted-foreground">Track and manage program reports</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {isManagement && (
            <Button onClick={handleDownload} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          )}
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{editingReport ? 'Edit Program Report' : 'Add Program Report'}</DialogTitle>
              </DialogHeader>
              <ProgramReportForm 
                initialData={editingReport}
                onSuccess={() => {
                  handleDialogClose();
                  refetch();
                }} 
                onCancel={handleDialogClose} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by staff or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Kibera Early Dinner">Kibera Early Dinner</SelectItem>
              <SelectItem value="Kawangware Lunch Hour">Kawangware Lunch Hour</SelectItem>
              <SelectItem value="Kipawa Sato">Kipawa Sato</SelectItem>
              <SelectItem value="Self-Empowerment">Self-Empowerment</SelectItem>
              <SelectItem value="Support Groups">Support Groups</SelectItem>
            </SelectContent>
          </Select>

          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {reportStats?.staffList?.map((staff) => (
                <SelectItem key={staff} value={staff}>
                  {staff}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary to-primary-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-foreground">{reportStats?.totalReports || 0}</div>
            <p className="text-xs text-primary-foreground/80">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary-foreground">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-secondary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">{reportStats?.thisMonth || 0}</div>
            <p className="text-xs text-secondary-foreground/80">Reports submitted</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent to-accent-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent-foreground">Active Programs</CardTitle>
            <Activity className="h-4 w-4 text-accent-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{Object.keys(reportStats?.programBreakdown || {}).length}</div>
            <p className="text-xs text-accent-foreground/80">Programs with reports</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary-light to-secondary-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Staff Contributors</CardTitle>
            <Users className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{reportStats?.uniqueStaff || 0}</div>
            <p className="text-xs text-white/80">Contributing staff</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports?.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{report.staff}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <FileText className="h-3 w-3 mr-1" />
                    {report.program}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <span className="sr-only">Actions</span>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem onClick={() => handleView(report)}>
                         <Eye className="h-4 w-4 mr-2" />
                         View
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => handleEdit(report)}>
                         <Edit className="h-4 w-4 mr-2" />
                         Edit
                       </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Report</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this program report? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(report.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(report.reporting_date).toLocaleDateString()}
              </div>
              <div className="text-sm">
                <strong>Summary:</strong> {report.executive_summary.substring(0, 120)}...
              </div>
              <div className="text-sm">
                <strong>Impact:</strong> {report.beneficiary_impact.substring(0, 100)}...
              </div>
              <div className="text-sm">
                <strong>Challenges:</strong> {report.challenges.substring(0, 100)}...
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No program reports found.</p>
        </div>
      )}

      {/* View Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Program Report Details
            </DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Staff Member</h3>
                  <p className="text-lg font-medium">{viewingReport.staff}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Program</h3>
                  <Badge variant="secondary" className="text-sm">
                    <FileText className="h-3 w-3 mr-1" />
                    {viewingReport.program}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Reporting Date</h3>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(viewingReport.reporting_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Executive Summary</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{viewingReport.executive_summary}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">Beneficiary Impact</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{viewingReport.beneficiary_impact}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">Challenges</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{viewingReport.challenges}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">Proposed Recommendations</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{viewingReport.proposed_recommendations}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(viewingReport);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}