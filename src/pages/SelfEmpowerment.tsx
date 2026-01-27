import { useState, useMemo } from "react";
import { Plus, Search, Coins, Download, Receipt, Edit, Trash2, Activity, MapPin, Briefcase, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelfEmpowermentForm } from "@/components/SelfEmpowermentForm";
import { LoanRepaymentForm } from "@/components/LoanRepaymentForm";
import { LoanPaymentsView } from "@/components/LoanPaymentsView";
import { LoansSummary } from "@/components/LoansSummary";
import { BusinessVisitsTab } from "@/components/self-empowerment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatSelfEmpowermentData } from "@/lib/downloadUtils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { StatsCard } from "@/components/StatsCard";

export default function SelfEmpowerment() {
  const { isAdmin, isManagement } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRepaymentDialogOpen, setIsRepaymentDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [residenceFilter, setResidenceFilter] = useState("");
  const [activeTab, setActiveTab] = useState("applications");

  const { data: selfEmpowermentRecords, refetch } = useQuery({
    queryKey: ['self-empowerment', currentOrganization?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('self_empowerment')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (currentOrganization?.organization_id) {
        query = query.eq('organization_id', currentOrganization.organization_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const filteredRecords = selfEmpowermentRecords?.filter(record => {
    const matchesSearch = record.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (record.business_name && record.business_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || statusFilter === 'all' || record.amount_status === statusFilter;
    const matchesResidence = !residenceFilter || residenceFilter === 'all' || record.residence === residenceFilter;
    
    return matchesSearch && matchesStatus && matchesResidence;
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setIsRepaymentDialogOpen(false);
    setEditingRecord(null);
    setSelectedRecord(null);
    refetch();
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  };

  const handleDelete = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('self_empowerment')
        .delete()
        .eq('id', recordId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Self-empowerment application deleted successfully",
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  const handleRepayment = (record: any) => {
    if (record.amount_status !== 'Loan') {
      toast({
        title: "Not Available",
        description: "Loan repayment is only available for loan recipients",
        variant: "destructive",
      });
      return;
    }
    setSelectedRecord(record);
    setIsRepaymentDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
  };

  // Calculate statistics from filtered data
  const statistics = useMemo(() => {
    if (!filteredRecords) return null;

    const totalApplications = filteredRecords.length;
    const activeApplications = filteredRecords.filter(r => r.is_active).length;
    const totalApproved = filteredRecords.reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0);
    const loanRecipients = filteredRecords.filter(r => r.amount_status === 'Loan').length;
    const grantRecipients = filteredRecords.filter(r => r.amount_status === 'Grant').length;
    const byResidence = filteredRecords.reduce((acc: any, record) => {
      if (record.residence) {
        acc[record.residence] = (acc[record.residence] || 0) + 1;
      }
      return acc;
    }, {});

    return { totalApplications, activeApplications, totalApproved, loanRecipients, grantRecipients, byResidence };
  }, [filteredRecords]);

  const handleDownload = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no self-empowerment records to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatSelfEmpowermentData(filteredRecords);
    downloadExcel(formattedData, 'self_empowerment_records', 'Self Empowerment Records');
    
    toast({
      title: "Download started",
      description: "Your self-empowerment records are being downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <PageHeroHeader
        title="Self-Empowerment"
        description="Business support and empowerment program"
        icon={Briefcase}
        iconColorClass="text-primary-foreground"
        stats={statistics ? [
          { label: 'Total Applications', value: statistics.totalApplications, icon: Users },
          { label: 'Total Approved', value: `KSH ${statistics.totalApproved.toLocaleString()}`, icon: Coins },
          { label: 'Loans', value: statistics.loanRecipients, icon: Receipt },
          { label: 'Grants', value: statistics.grantRecipients, icon: Activity },
        ] : undefined}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card/50">
          <TabsTrigger value="applications" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            Applications
          </TabsTrigger>
          <TabsTrigger value="business-visits" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Building2 className="h-4 w-4" />
            Business Visits
          </TabsTrigger>
          <TabsTrigger value="loans-summary" disabled={!isAdmin && !isManagement} className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            Loans Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">
          {/* Stats Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Applications"
                value={statistics.totalApplications}
                subtitle={`${statistics.activeApplications} active`}
                icon={Users}
                colorVariant="blue"
              />
              <StatsCard
                title="Total Approved"
                value={`KSH ${statistics.totalApproved.toLocaleString()}`}
                subtitle="Total disbursed"
                icon={Coins}
                colorVariant="emerald"
              />
              <StatsCard
                title="By Type"
                value=""
                icon={Activity}
                colorVariant="purple"
              >
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Loans</span>
                    <span className="font-semibold">{statistics.loanRecipients}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Grants</span>
                    <span className="font-semibold">{statistics.grantRecipients}</span>
                  </div>
                </div>
              </StatsCard>
              <StatsCard
                title="By Residence"
                value=""
                icon={MapPin}
                colorVariant="orange"
              >
                <div className="space-y-1">
                  {Object.entries(statistics.byResidence).map(([residence, count]: any) => (
                    <div key={residence} className="flex justify-between text-sm">
                      <span className="text-xs">{residence}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(statistics.byResidence).length === 0 && (
                    <div className="text-sm text-muted-foreground">No data</div>
                  )}
                </div>
              </StatsCard>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Applications</h2>
              <p className="text-muted-foreground">Manage self-empowerment applications</p>
            </div>
            
            <div className="flex gap-2">
              {isAdmin && (
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel
                </Button>
              )}
              
              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:bg-gradient-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Application
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRecord ? 'Edit Self-Empowerment Application' : 'Add Self-Empowerment Application'}
                      </DialogTitle>
                    </DialogHeader>
                    <SelfEmpowermentForm
                      record={editingRecord}
                      onSuccess={handleSuccess}
                      onCancel={handleDialogClose}
                    />
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={isRepaymentDialogOpen} onOpenChange={setIsRepaymentDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Record Loan Repayment</DialogTitle>
                  </DialogHeader>
                  {selectedRecord && (
                    <LoanRepaymentForm
                      selfEmpowermentId={selectedRecord.id}
                      applicantName={selectedRecord.full_name}
                      onSuccess={handleSuccess}
                      onCancel={() => setIsRepaymentDialogOpen(false)}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or business..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Loan">Loan</SelectItem>
                <SelectItem value="Grant">Grant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={residenceFilter} onValueChange={setResidenceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by residence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Residences</SelectItem>
                <SelectItem value="Kibera">Kibera</SelectItem>
                <SelectItem value="Kawangware">Kawangware</SelectItem>
                <SelectItem value="Diaspora">Diaspora</SelectItem>
                <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords?.map((record) => (
              <Card key={record.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="text-lg">{record.full_name}</span>
                    <div className="flex gap-2">
                      <Badge variant={record.amount_status === 'Grant' ? 'default' : 'secondary'}>
                        {record.amount_status || 'Pending'}
                      </Badge>
                      <Badge variant={record.is_active ? 'default' : 'destructive'}>
                        {record.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <strong>Business:</strong> {record.business_name || 'Not specified'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Type:</strong> {record.type_of_business || 'Not specified'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Location:</strong> {record.business_location || 'Not specified'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Residence:</strong> {record.residence || 'Not specified'}
                  </div>
                  {record.amount_requested && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      <strong>Requested:</strong> {Number(record.amount_requested).toLocaleString()}
                    </div>
                  )}
                  {record.amount_approved && (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      <strong>Approved:</strong> {Number(record.amount_approved).toLocaleString()}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <strong>Contact:</strong> {record.contact || 'Not provided'}
                  </div>
                  {record.current_status && (
                    <div className="text-sm">
                      <strong>Status:</strong> {record.current_status}
                    </div>
                  )}
                  
                  {isAdmin && (
                    <div className="flex flex-col gap-2 pt-3">
                      {record.amount_status === 'Loan' && (
                        <div className="flex gap-2">
                          <LoanPaymentsView selfEmpowermentRecord={record} />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRepayment(record)}
                            className="flex-1"
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            Repayment
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(record)}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Application</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {record.full_name}'s application? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(record.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecords?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No self-empowerment applications found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="business-visits">
          <BusinessVisitsTab />
        </TabsContent>

        <TabsContent value="loans-summary">
          <LoansSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}