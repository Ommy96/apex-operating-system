import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { MedicalForm } from "@/components/MedicalForm";
import { HospitalVisitsTab, HomeVisitsTab } from "@/components/visits";
import { Download, Plus, Search, Eye, Edit, Trash2, Stethoscope, MapPin, User, Activity, Users, FileText, Hospital, Home } from "lucide-react";
import * as XLSX from 'xlsx';
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { StatsCard } from "@/components/StatsCard";

export default function Medical() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("records");
  
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();

  const { data: medicalRecords = [], refetch } = useQuery({
    queryKey: ["medical-records", currentOrganization?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from("medical_records")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (currentOrganization?.organization_id) {
        query = query.eq('organization_id', currentOrganization.organization_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const filteredRecords = medicalRecords.filter((record) => {
    const matchesSearch = record.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.medical_condition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.hospital?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === "all" || record.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  const handleSuccess = () => {
    setIsAddDialogOpen(false);
    setEditingRecord(null);
    refetch();
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsAddDialogOpen(true);
  };

  const handleView = (record: any) => {
    setSelectedRecord(record);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    
    try {
      const { error } = await supabase
        .from("medical_records")
        .delete()
        .eq("id", selectedRecord.id);

      if (error) throw error;

      toast({ title: "Medical record deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedRecord(null);
      refetch();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error deleting record",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingRecord(null);
  };

  const handleDownload = () => {
    const dataToExport = filteredRecords.map(record => ({
      'Full Name': record.full_name,
      'Location': record.location || 'N/A',
      'Gender': record.gender || 'N/A',
      'Medical Condition': record.medical_condition,
      'Hospital': record.hospital,
      'Doctor\'s Report': record.doctors_report || 'N/A',
      'Outcome': record.outcome || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Medical Records");
    XLSX.writeFile(wb, `medical_records_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: "Medical records exported successfully" });
  };

  const statistics = useMemo(() => {
    if (!filteredRecords) return null;

    const totalRecords = filteredRecords.length;
    const byLocation = filteredRecords.reduce((acc: any, record) => {
      if (record.location) {
        acc[record.location] = (acc[record.location] || 0) + 1;
      }
      return acc;
    }, {});
    const byGender = filteredRecords.reduce((acc: any, record) => {
      if (record.gender) {
        acc[record.gender] = (acc[record.gender] || 0) + 1;
      }
      return acc;
    }, {});
    const recentRecords = filteredRecords.filter(record => {
      const recordDate = new Date(record.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return recordDate >= thirtyDaysAgo;
    }).length;

    return { totalRecords, byLocation, byGender, recentRecords };
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <PageHeroHeader
        title="Medical Program"
        description="Track medical assistance provided to students and guardians"
        icon={Stethoscope}
        iconColorClass="text-primary-foreground"
        actions={
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {isAdmin && (
              <Button onClick={() => setIsAddDialogOpen(true)} className="bg-accent hover:bg-accent-dark text-accent-foreground shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            )}
          </div>
        }
        stats={statistics ? [
          { label: 'Total Records', value: statistics.totalRecords, icon: Activity },
          { label: 'Recent (30d)', value: statistics.recentRecords, icon: Stethoscope },
        ] : undefined}
      />

      {/* Tabs for Records and Visits */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/50">
          <TabsTrigger value="records" className="flex items-center gap-2 data-[state=active]:bg-accent">
            <Stethoscope className="h-4 w-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="hospital-visits" className="flex items-center gap-2 data-[state=active]:bg-accent">
            <Hospital className="h-4 w-4" />
            Hospital Visits
          </TabsTrigger>
          <TabsTrigger value="home-visits" className="flex items-center gap-2 data-[state=active]:bg-accent">
            <Home className="h-4 w-4" />
            Home Visits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, condition, or hospital..."
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
            <SelectItem value="kibera">Kibera</SelectItem>
            <SelectItem value="kawangware">Kawangware</SelectItem>
            <SelectItem value="diaspora">Diaspora</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Records"
            value={statistics.totalRecords}
            icon={Activity}
            colorVariant="blue"
          />
          <StatsCard
            title="Recent Cases (30d)"
            value={statistics.recentRecords}
            subtitle="Last 30 days"
            icon={Stethoscope}
            colorVariant="emerald"
          />
          <StatsCard
            title="By Location"
            value=""
            icon={MapPin}
            colorVariant="purple"
          >
            <div className="space-y-1">
              {Object.entries(statistics.byLocation).map(([location, count]: any) => (
                <div key={location} className="flex justify-between text-sm">
                  <span className="capitalize">{location}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(statistics.byLocation).length === 0 && (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </div>
          </StatsCard>
          <StatsCard
            title="By Gender"
            value=""
            icon={Users}
            colorVariant="orange"
          >
            <div className="space-y-1">
              {Object.entries(statistics.byGender).map(([gender, count]: any) => (
                <div key={gender} className="flex justify-between text-sm">
                  <span className="capitalize">{gender}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(statistics.byGender).length === 0 && (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </div>
          </StatsCard>
        </div>
      )}

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecords.map((record) => (
          <Card key={record.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                {record.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {record.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {record.location}
                </div>
              )}
              <div className="text-sm">
                <span className="font-semibold">Condition:</span> {record.medical_condition}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Hospital:</span> {record.hospital}
              </div>
              {record.gender && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  {record.gender}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleView(record)}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {isAdmin && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(record)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRecord(record);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
        </TabsContent>

        <TabsContent value="hospital-visits">
          <HospitalVisitsTab />
        </TabsContent>

        <TabsContent value="home-visits">
          <HomeVisitsTab programContext="Medical Program" />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Edit Medical Record" : "Add Medical Record"}
            </DialogTitle>
          </DialogHeader>
          <MedicalForm
            record={editingRecord}
            onSuccess={handleSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Stethoscope className="h-6 w-6 text-primary" />
              Medical Record Details
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Patient Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      Full Name
                    </div>
                    <p className="text-base font-medium">{selectedRecord.full_name}</p>
                  </div>
                  {selectedRecord.gender && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <User className="h-4 w-4" />
                        Gender
                      </div>
                      <p className="text-base capitalize">{selectedRecord.gender}</p>
                    </div>
                  )}
                  {selectedRecord.location && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Location
                      </div>
                      <p className="text-base">{selectedRecord.location}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medical Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Medical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Stethoscope className="h-4 w-4" />
                      Medical Condition
                    </div>
                    <p className="text-base">{selectedRecord.medical_condition}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Hospital
                    </div>
                    <p className="text-base">{selectedRecord.hospital}</p>
                  </div>
                  {selectedRecord.doctors_report && (
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Doctor's Report</h3>
                      <p className="text-base bg-muted p-3 rounded-md">{selectedRecord.doctors_report}</p>
                    </div>
                  )}
                  {selectedRecord.outcome && (
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Outcome</h3>
                      <p className="text-base bg-muted p-3 rounded-md">{selectedRecord.outcome}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this medical record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
