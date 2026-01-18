import { useState, useMemo } from "react";
import { Plus, Search, Calendar, MapPin, Download, FileText, Users, TrendingUp, Edit, Trash2, Eye, User } from "lucide-react";
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
import { useOrganization } from "@/hooks/useOrganization";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { Home } from "lucide-react";

export default function HomeVisitReports() {
  const { isManagement, isStaff, userRole, user } = useAuth();
  const { currentOrganization } = useOrganization();
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
    queryKey: ['programs', currentOrganization?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (currentOrganization?.organization_id) {
        query = query.eq('organization_id', currentOrganization.organization_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const { data: homeVisitReports, refetch } = useQuery({
    queryKey: ['home-visit-reports', userRole, user?.id, currentOrganization?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('home_visit_reports')
        .select('*');
      
      if (currentOrganization?.organization_id) {
        query = query.eq('organization_id', currentOrganization.organization_id);
      }
      
      // Staff can only see their own reports
      if (isStaff && user?.id) {
        query = query.eq('created_by', user.id);
      }
      
      query = query.order('visit_date', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch children for student name lookup
  const { data: children } = useQuery({
    queryKey: ['children-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name');
      if (error) throw error;
      return data;
    },
  });

  // Create a lookup map for children
  const childrenMap = useMemo(() => {
    const map = new Map<string, { first_name: string; last_name: string }>();
    children?.forEach(child => {
      map.set(child.id, { first_name: child.first_name, last_name: child.last_name });
    });
    return map;
  }, [children]);

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
      <PageHeroHeader
        title="Home Visit Reports"
        description="Track and manage home visit reports"
        icon={Home}
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            {(isManagement || userRole === 'admin') && (
              <Button onClick={handleDownload} variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2">
                <Download className="h-4 w-4" />
                Download Excel
              </Button>
            )}
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30" onClick={() => setIsDialogOpen(true)}>
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
        }
      />

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
        <Card className={`${getCardStyles(0)} hover-scale`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(1)} hover-scale`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats?.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">Reports submitted</p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(2)} hover-scale`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(reportStats?.locationBreakdown || {}).length}</div>
            <p className="text-xs text-muted-foreground">Locations visited</p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(3)} hover-scale`}>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">Home Visit Report Details</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 py-4">
                {/* Basic Information Section */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-primary">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-muted-foreground">Staff Member</span>
                      </div>
                      <p className="text-base font-medium">{viewingReport.staff}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-muted-foreground">Visit Date</span>
                      </div>
                      <p className="text-base font-medium">{new Date(viewingReport.visit_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-muted-foreground">Student Name</span>
                      </div>
                      <p className="text-base font-medium">
                        {viewingReport.student_id && childrenMap.get(viewingReport.student_id)
                          ? `${childrenMap.get(viewingReport.student_id)?.first_name} ${childrenMap.get(viewingReport.student_id)?.last_name}` 
                          : 'Not specified'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-muted-foreground">Location</span>
                      </div>
                      <p className="text-base font-medium">{viewingReport.location || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Visit Purpose Section */}
                <div className="bg-secondary/10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-secondary">Visit Purpose</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm text-muted-foreground">Reason for Visit</span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {viewingReport.reason_for_visit || 'Not specified'}
                    </Badge>
                  </div>
                </div>

                {/* Report Content Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-accent">Report Content</h3>
                  
                  <div className="bg-accent/5 rounded-lg p-4 border-l-4 border-accent">
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-muted-foreground">Observation Findings</span>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                        {viewingReport.observation_findings}
                      </p>
                    </div>
                  </div>

                  <div className="bg-destructive/5 rounded-lg p-4 border-l-4 border-destructive/30">
                    <div className="space-y-2 mb-3">
                      <span className="font-medium text-sm text-muted-foreground">Challenges Identified</span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                        {viewingReport.challenges_identified}
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
                    <div className="space-y-2 mb-3">
                      <span className="font-medium text-sm text-muted-foreground">Recommendations</span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                        {viewingReport.recommendations}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Report Metadata Section */}
                <div className="bg-muted/10 rounded-lg p-4 border-t">
                  <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Report Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="font-medium text-sm text-muted-foreground">Created On</span>
                      <p className="text-sm">{new Date(viewingReport.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="font-medium text-sm text-muted-foreground">Last Updated</span>
                      <p className="text-sm">{new Date(viewingReport.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}