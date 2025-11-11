import { useState } from "react";
import { Plus, Search, Calendar, MapPin, Download, FileText, Users, TrendingUp, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HomeVisitReportForm } from "@/components/HomeVisitReportForm";
import { downloadExcel, formatHomeVisitReportsData } from "@/lib/downloadUtils";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";

export default function HomeVisitReports() {
  const { isManagement, isStaff, userRole, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // Fetch programs for the filter dropdown
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: homeVisitReports, refetch } = useQuery({
    queryKey: ['home-visit-reports', userRole, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('home_visit_reports')
        .select('*');
      
      // Staff can only see their own reports
      if (isStaff && user?.id) {
        query = query.eq('created_by', user.id);
      }
      
      query = query.order('visit_date', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats for summary cards
  const { data: reportStats } = useQuery({
    queryKey: ['home-visit-reports-stats'],
    queryFn: async () => {
      const totalReports = homeVisitReports?.length || 0;
      const thisMonth = homeVisitReports?.filter(report => {
        const reportDate = new Date(report.visit_date);
        const now = new Date();
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }).length || 0;
      
      const locationBreakdown = homeVisitReports?.reduce((acc, report) => {
        acc[report.location] = (acc[report.location] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const uniqueStaff = new Set(homeVisitReports?.map(r => r.staff) || []).size;
      const staffList = Array.from(new Set(homeVisitReports?.map(r => r.staff) || [])).sort();
      
      // Get unique months from reports
      const uniqueMonths = Array.from(new Set(homeVisitReports?.map(r => {
        const date = new Date(r.visit_date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }) || [])).sort().reverse();
      
      return { totalReports, thisMonth, locationBreakdown, uniqueStaff, staffList, uniqueMonths };
    },
    enabled: !!homeVisitReports,
  });

  const filteredReports = homeVisitReports?.filter(report => {
    const matchesSearch = report.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.reason_for_visit?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !locationFilter || locationFilter === 'all' || report.location === locationFilter;
    const matchesStaff = !staffFilter || staffFilter === 'all' || report.staff === staffFilter;
    
    const matchesMonth = !monthFilter || monthFilter === 'all' || (() => {
      const reportDate = new Date(report.visit_date);
      const reportMonth = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      return reportMonth === monthFilter;
    })();
    
    return matchesSearch && matchesLocation && matchesStaff && matchesMonth;
  });

  const handleDownload = () => {
    if (!filteredReports || filteredReports.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no home visit reports to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatHomeVisitReportsData(filteredReports);
    downloadExcel(formattedData, 'home_visit_reports', 'Home Visit Reports');
    
    toast({
      title: "Download started",
      description: "Your home visit reports are being downloaded.",
    });
  };

  const handleEdit = (report: any) => {
    // Staff can only edit their own reports
    if (isStaff && report.created_by !== user?.id) {
      toast({
        title: "Access Denied",
        description: "You can only edit your own reports",
        variant: "destructive",
      });
      return;
    }
    setEditingReport(report);
    setIsDialogOpen(true);
  };

  const handleView = (report: any) => {
    setViewingReport(report);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (reportId: string, report: any) => {
    // Staff can only delete their own reports
    if (isStaff && report.created_by !== user?.id) {
      toast({
        title: "Access Denied",
        description: "You can only delete your own reports",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('home_visit_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Home visit report deleted successfully",
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
          <h1 className="text-3xl font-bold">Home Visit Reports</h1>
          <p className="text-muted-foreground">Track and manage home visit reports</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Only management/admin can download reports */}
          {(isManagement || userRole === 'admin') && (
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
                <DialogTitle>{editingReport ? 'Edit Home Visit Report' : 'Add Home Visit Report'}</DialogTitle>
              </DialogHeader>
              <HomeVisitReportForm 
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by staff or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="Kibera">Kibera</SelectItem>
            <SelectItem value="Kawangware">Kawangware</SelectItem>
            <SelectItem value="Diaspora">Diaspora</SelectItem>
            <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
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

        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {reportStats?.uniqueMonths?.map((month) => {
              const [year, monthNum] = month.split('-');
              const date = new Date(parseInt(year), parseInt(monthNum) - 1);
              const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return (
                <SelectItem key={month} value={month}>
                  {monthName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
            <CardTitle className="text-sm font-medium text-accent-foreground">Active Locations</CardTitle>
            <MapPin className="h-4 w-4 text-accent-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{Object.keys(reportStats?.locationBreakdown || {}).length}</div>
            <p className="text-xs text-accent-foreground/80">Locations visited</p>
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
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(report.visit_date).toLocaleDateString()}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.location && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {report.location}
                </div>
              )}
              {report.reason_for_visit && (
                <div className="text-sm">
                  <strong>Reason:</strong> {report.reason_for_visit}
                </div>
              )}
              <div className="text-sm">
                <strong>Findings:</strong> {report.observation_findings.substring(0, 100)}...
              </div>
              <div className="text-sm">
                <strong>Challenges:</strong> {report.challenges_identified.substring(0, 100)}...
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(report)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                {/* Staff can only edit their own reports, management/admin can edit all */}
                {(userRole === 'admin' || isManagement || (isStaff && report.created_by === user?.id)) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(report)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                {/* Staff can only delete their own reports, management/admin can delete all */}
                {(userRole === 'admin' || isManagement || (isStaff && report.created_by === user?.id)) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
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
                        <AlertDialogAction onClick={() => handleDelete(report.id, report)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {isStaff ? "You have not submitted any home visit reports yet." : "No home visit reports found."}
          </p>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5" />
              Home Visit Report Details
            </DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Staff Member</h3>
                    <p className="text-lg font-medium">{viewingReport.staff}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Visit Date</h3>
                    <p className="flex items-center gap-1 font-medium">
                      <Calendar className="h-4 w-4" />
                      {new Date(viewingReport.visit_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Location</h3>
                    <p className="font-medium">{viewingReport.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Student ID</h3>
                    <p className="font-medium">{viewingReport.student_id || 'Not specified'}</p>
                  </div>
                </div>
                
                {viewingReport.reason_for_visit && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base">Reason for Visit</h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">{viewingReport.reason_for_visit}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base mb-2">Observation Findings</h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingReport.observation_findings}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-base mb-2">Challenges Identified</h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingReport.challenges_identified}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-base mb-2">Recommendations</h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingReport.recommendations}</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Report created on {new Date(viewingReport.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}