import { useState } from "react";
import { Plus, Search, Calendar, MapPin, Download, FileText, Users, TrendingUp, Edit, Trash2 } from "lucide-react";
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

export default function HomeVisitReports() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const { data: homeVisitReports, refetch } = useQuery({
    queryKey: ['home-visit-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_visit_reports')
        .select('*')
        .order('visit_date', { ascending: false });
      
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
      
      return { totalReports, thisMonth, locationBreakdown, uniqueStaff };
    },
    enabled: !!homeVisitReports,
  });

  const filteredReports = homeVisitReports?.filter(report => {
    const matchesSearch = report.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.reason_for_visit?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !locationFilter || locationFilter === 'all' || report.location === locationFilter;
    
    return matchesSearch && matchesLocation;
  });

  const handleDownload = () => {
    if (!homeVisitReports || homeVisitReports.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no home visit reports to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatHomeVisitReportsData(homeVisitReports);
    downloadExcel(formattedData, 'home_visit_reports', 'Home Visit Reports');
    
    toast({
      title: "Download started",
      description: "Your home visit reports are being downloaded.",
    });
  };

  const handleEdit = (report: any) => {
    setEditingReport(report);
    setIsDialogOpen(true);
  };

  const handleDelete = async (reportId: string) => {
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
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{editingReport ? 'Edit Home Visit Report' : 'Add Home Visit Report'}</DialogTitle>
              </DialogHeader>
              <HomeVisitReportForm 
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
                              Are you sure you want to delete this home visit report? This action cannot be undone.
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
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No home visit reports found.</p>
        </div>
      )}
    </div>
  );
}