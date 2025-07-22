import { useState } from "react";
import { Plus, Search, Calendar, Activity, Download, Edit, Trash2, FileText, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivityReportForm } from "@/components/ActivityReportForm";
import { downloadExcel, formatActivityReportsData } from "@/lib/downloadUtils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ActivityReports() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const { toast } = useToast();

  const { data: activityReports, refetch } = useQuery({
    queryKey: ['activity-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_reports')
        .select('*')
        .order('reporting_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats for summary cards
  const { data: reportStats } = useQuery({
    queryKey: ['activity-reports-stats'],
    queryFn: async () => {
      const totalReports = activityReports?.length || 0;
      const thisMonth = activityReports?.filter(report => {
        const reportDate = new Date(report.reporting_date);
        const now = new Date();
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }).length || 0;
      
      const programBreakdown = activityReports?.reduce((acc, report) => {
        acc[report.program] = (acc[report.program] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const uniqueStaff = new Set(activityReports?.map(r => r.staff) || []).size;
      
      return { totalReports, thisMonth, programBreakdown, uniqueStaff };
    },
    enabled: !!activityReports,
  });

  const filteredReports = activityReports?.filter(report => {
    const matchesSearch = report.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.executive_summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = !programFilter || programFilter === 'all' || report.program === programFilter;
    
    return matchesSearch && matchesProgram;
  });

  const handleDownload = () => {
    if (!filteredReports || filteredReports.length === 0) {
      toast({
        title: "No Data",
        description: "No activity reports to download",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatActivityReportsData(filteredReports);
    downloadExcel(formattedData, 'Activity_Reports', 'Activity Reports');
    
    toast({
      title: "Success",
      description: "Activity reports downloaded successfully",
    });
  };

  const handleEdit = (report: any) => {
    setEditingReport(report);
    setIsDialogOpen(true);
  };

  const handleDelete = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('activity_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity report deleted successfully",
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
          <h1 className="text-3xl font-bold">Activity Reports</h1>
          <p className="text-muted-foreground">Track and manage activity reports</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingReport ? 'Edit Activity Report' : 'Add Activity Report'}</DialogTitle>
            </DialogHeader>
            <ActivityReportForm 
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by staff or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats?.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">Reports submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(reportStats?.programBreakdown || {}).length}</div>
            <p className="text-xs text-muted-foreground">Programs with reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Contributors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats?.uniqueStaff || 0}</div>
            <p className="text-xs text-muted-foreground">Contributing staff</p>
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
                    <Activity className="h-3 w-3 mr-1" />
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
                              Are you sure you want to delete this activity report? This action cannot be undone.
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
          <p className="text-muted-foreground">No activity reports found.</p>
        </div>
      )}
    </div>
  );
}