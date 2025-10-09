import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MedicalForm } from "@/components/MedicalForm";
import { Download, Plus, Search, Eye, Edit, Trash2, Stethoscope, MapPin, Calendar, GraduationCap } from "lucide-react";
import * as XLSX from 'xlsx';

export default function Medical() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const { data: medicalRecords = [], refetch } = useQuery({
    queryKey: ["medical-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
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
      'Date': new Date(record.date).toLocaleDateString(),
      'Location': record.location || 'N/A',
      'Medical Condition': record.medical_condition,
      'Hospital': record.hospital,
      'Academic Level': record.academic_level || 'N/A',
      'Doctor\'s Report': record.doctors_report || 'N/A',
      'Outcome': record.outcome || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Medical Records");
    XLSX.writeFile(wb, `medical_records_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: "Medical records exported successfully" });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Medical Program</h1>
          <p className="text-muted-foreground">Track medical assistance provided to students and guardians</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          )}
        </div>
      </div>

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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(record.date).toLocaleDateString()}
              </div>
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
              {record.academic_level && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  {record.academic_level}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medical Record Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Full Name</h3>
                <p>{selectedRecord.full_name}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Date</h3>
                <p>{new Date(selectedRecord.date).toLocaleDateString()}</p>
              </div>
              {selectedRecord.location && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Location</h3>
                  <p>{selectedRecord.location}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Medical Condition</h3>
                <p>{selectedRecord.medical_condition}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Hospital</h3>
                <p>{selectedRecord.hospital}</p>
              </div>
              {selectedRecord.academic_level && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Academic Level</h3>
                  <p>{selectedRecord.academic_level}</p>
                </div>
              )}
              {selectedRecord.doctors_report && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Doctor's Report</h3>
                  <p>{selectedRecord.doctors_report}</p>
                </div>
              )}
              {selectedRecord.outcome && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Outcome</h3>
                  <p>{selectedRecord.outcome}</p>
                </div>
              )}
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
