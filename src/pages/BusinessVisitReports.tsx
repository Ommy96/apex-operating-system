import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BusinessVisitReportForm } from '@/components/BusinessVisitReportForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Download, Plus, Search, Eye, Edit, Trash2, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BusinessVisitReports() {
  const { toast } = useToast();
  const { user, isAdmin, isManagement, isStaff } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  // Fetch business visit reports
  const { data: businessVisitReports = [], isLoading } = useQuery({
    queryKey: ['business-visit-reports'],
    queryFn: async () => {
      let query = supabase
        .from('business_visit_reports')
        .select(`
          *,
          business:self_empowerment(full_name, business_name)
        `)
        .order('visit_date', { ascending: false });

      if (isStaff && !isAdmin && !isManagement) {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate statistics
  const { data: stats } = useQuery({
    queryKey: ['business-visit-stats', businessVisitReports],
    enabled: businessVisitReports.length > 0,
    queryFn: async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonthReports = businessVisitReports.filter((report: any) => {
        const reportDate = new Date(report.visit_date);
        return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
      });

      const locationBreakdown = businessVisitReports.reduce((acc: any, report: any) => {
        const location = report.location || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      const uniqueStaff = new Set(businessVisitReports.map((r: any) => r.staff)).size;
      const uniqueMonths = new Set(
        businessVisitReports.map((r: any) => {
          const date = new Date(r.visit_date);
          return `${date.getFullYear()}-${date.getMonth()}`;
        })
      ).size;

      return {
        totalReports: businessVisitReports.length,
        thisMonth: thisMonthReports.length,
        locationBreakdown,
        uniqueStaff,
        uniqueMonths,
      };
    },
  });

  const filteredReports = businessVisitReports.filter((report: any) => {
    const matchesSearch =
      report.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.business?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.business?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation = locationFilter === 'all' || report.location === locationFilter;

    const matchesMonth = monthFilter === 'all' || (() => {
      const reportDate = new Date(report.visit_date);
      const reportMonth = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      return reportMonth === monthFilter;
    })();

    return matchesSearch && matchesLocation && matchesMonth;
  });

  const handleDownload = () => {
    const exportData = filteredReports.map((report: any) => ({
      'Visit Date': new Date(report.visit_date).toLocaleDateString(),
      'Staff': report.staff,
      'Business/Person': report.business?.full_name || 'N/A',
      'Business Name': report.business?.business_name || 'N/A',
      'Location': report.location || 'N/A',
      'Reason for Visit': report.reason_for_visit || 'N/A',
      'Observation Findings': report.observation_findings,
      'Challenges Identified': report.challenges_identified,
      'Recommendations': report.recommendations,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Business Visit Reports');
    XLSX.writeFile(wb, `business-visit-reports-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Success",
      description: "Business visit reports downloaded successfully",
    });
  };

  const handleEdit = (report: any) => {
    setSelectedReport(report);
    setIsAddDialogOpen(true);
  };

  const handleView = (report: any) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (reportId: string) => {
    if (!isAdmin && !isManagement) {
      toast({
        title: "Permission Denied",
        description: "Only admins and management can delete reports",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm('Are you sure you want to delete this report?')) {
      const { error } = await supabase
        .from('business_visit_reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete report",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Report deleted successfully",
        });
        queryClient.invalidateQueries({ queryKey: ['business-visit-reports'] });
      }
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setSelectedReport(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['business-visit-reports'] });
    handleDialogClose();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Business Visit Reports
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage business visit reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Report
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by staff or business name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="Kibera">Kibera</SelectItem>
            <SelectItem value="Kawangware">Kawangware</SelectItem>
            <SelectItem value="Others">Others</SelectItem>
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return <SelectItem key={value} value={value}>{label}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time visits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Building2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Recent visits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Staff</CardTitle>
            <Building2 className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats?.uniqueStaff || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Team members</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <Building2 className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stats?.locationBreakdown ? Object.keys(stats.locationBreakdown).length : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Areas covered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredReports.map((report: any, index: any) => {
          const colors = [
            'from-pink-500/10 to-pink-500/5 border-pink-500/20',
            'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
            'from-amber-500/10 to-amber-500/5 border-amber-500/20',
            'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
            'from-violet-500/10 to-violet-500/5 border-violet-500/20',
            'from-rose-500/10 to-rose-500/5 border-rose-500/20',
          ];
          const colorClass = colors[index % colors.length];
          
          return (
            <Card key={report.id} className={`bg-gradient-to-br ${colorClass} hover:shadow-lg transition-all duration-300`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <Building2 className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <span className="line-clamp-1">{report.business?.full_name || 'N/A'}</span>
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {report.business?.business_name && (
                    <span className="font-medium">{report.business.business_name}</span>
                  )}
                  {report.business?.business_name && <span>•</span>}
                  <span>{new Date(report.visit_date).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2">
                  <span className="font-semibold text-primary">Staff:</span> 
                  <span className="text-foreground">{report.staff}</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2">
                  <span className="font-semibold text-primary">Location:</span> 
                  <span className="text-foreground">{report.location || 'N/A'}</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-primary block mb-1">Findings:</span>
                  <p className="text-muted-foreground line-clamp-2 bg-background/50 rounded-lg p-2">
                    {report.observation_findings}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(report)}
                    className="flex-1 bg-background/80"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {(isAdmin || isManagement || report.created_by === user?.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(report)}
                      className="flex-1 bg-background/80"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {(isAdmin || isManagement) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(report.id)}
                      className="bg-background/80"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No reports found</h3>
          <p className="text-muted-foreground">
            {searchTerm || locationFilter !== 'all' || monthFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating a new business visit report'}
          </p>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport ? 'Edit Business Visit Report' : 'Add Business Visit Report'}
            </DialogTitle>
            <DialogDescription>
              {selectedReport
                ? 'Update the business visit report details below'
                : 'Fill in the business visit report details below'}
            </DialogDescription>
          </DialogHeader>
          <BusinessVisitReportForm
            onSuccess={handleSuccess}
            onCancel={handleDialogClose}
            initialData={selectedReport}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={() => setIsViewDialogOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Business Visit Report</DialogTitle>
            <DialogDescription>
              Comprehensive details of the business visit
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Business & Visit Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Business/Person</div>
                      <div className="font-medium">
                        {selectedReport.business?.full_name || 'N/A'}
                      </div>
                      {selectedReport.business?.business_name && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {selectedReport.business.business_name}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Location</div>
                      <div className="font-medium">{selectedReport.location || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Visit Date</div>
                      <div className="font-medium">
                        {new Date(selectedReport.visit_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Staff Member</div>
                      <div className="font-medium">{selectedReport.staff}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reason for Visit */}
                {selectedReport.reason_for_visit && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Reason for Visit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed">
                        {selectedReport.reason_for_visit}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Observation Findings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Observation Findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedReport.observation_findings}
                    </p>
                  </CardContent>
                </Card>

                {/* Challenges */}
                <Card className="border-destructive/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      Challenges Identified
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedReport.challenges_identified}
                    </p>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedReport.recommendations}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
