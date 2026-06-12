import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, 
  GraduationCap, 
  TrendingUp, 
  Award, 
  Edit, 
  Trash2,
  BookOpen,
  Calendar
} from "lucide-react";
import { InlineEditableField } from "./InlineEditableField";
import { saveBeneficiaryField } from "@/lib/saveBeneficiaryField";

interface BeneficiaryAcademicsTabProps {
  beneficiaryId: string;
  beneficiary?: any;
  organizationId?: string | null;
  canEdit?: boolean;
  userId?: string | null;
  onLocalUpdate?: (partial: Record<string, any>) => void;
}

interface AcademicRecord {
  id: string;
  beneficiary_id: string;
  organization_id: string;
  academic_year: number;
  term: string;
  overall_grade: string | null;
  total_marks: number | null;
  out_of: number | null;
  position: number | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  academic_year: string;
  term: string;
  overall_grade: string;
  total_marks: string;
  out_of: string;
  position: string;
  remarks: string;
}

const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);
const TERMS = ["Term 1", "Term 2", "Term 3"];
const GRADES = ["ME1", "ME2", "BE1", "BE2", "AE1", "AE2", "EE1", "EE2", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"];

const getGradeColor = (grade: string | null) => {
  if (!grade) return "bg-muted text-muted-foreground";
  const gradeUpper = grade.toUpperCase();
  if (gradeUpper.startsWith("ME") || gradeUpper.startsWith("A")) return "bg-success/20 text-success border-success/30";
  if (gradeUpper.startsWith("BE") || gradeUpper.startsWith("B")) return "bg-primary/20 text-primary border-primary/30";
  if (gradeUpper.startsWith("AE") || gradeUpper.startsWith("C")) return "bg-warning/20 text-warning border-warning/30";
  if (gradeUpper.startsWith("EE") || gradeUpper.startsWith("D")) return "bg-accent/20 text-accent-foreground border-accent/30";
  return "bg-destructive/20 text-destructive border-destructive/30";
};

const initialFormState: FormState = {
  academic_year: currentYear.toString(),
  term: "",
  overall_grade: "",
  total_marks: "",
  out_of: "",
  position: "",
  remarks: "",
};

export function BeneficiaryAcademicsTab({
  beneficiaryId,
  beneficiary,
  organizationId: orgIdProp,
  canEdit = false,
  userId,
  onLocalUpdate,
}: BeneficiaryAcademicsTabProps) {
  const { currentOrganization } = useOrganization();
  const organizationId = orgIdProp ?? currentOrganization?.organization_id ?? null;
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["beneficiary-academics", beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiary_academics")
        .select("*")
        .eq("beneficiary_id", beneficiaryId)
        .order("academic_year", { ascending: false })
        .order("term", { ascending: false });

      if (error) throw error;
      return data as AcademicRecord[];
    },
    enabled: !!beneficiaryId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const { error } = await supabase.from("beneficiary_academics").insert({
        beneficiary_id: beneficiaryId,
        organization_id: currentOrganization?.organization_id,
        academic_year: parseInt(data.academic_year),
        term: data.term,
        overall_grade: data.overall_grade || null,
        total_marks: data.total_marks ? parseInt(data.total_marks) : null,
        out_of: data.out_of ? parseInt(data.out_of) : null,
        position: data.position ? parseInt(data.position) : null,
        remarks: data.remarks || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiary-academics", beneficiaryId] });
      toast.success("Academic record added successfully");
      setIsDialogOpen(false);
      setFormData(initialFormState);
    },
    onError: (error) => {
      toast.error("Failed to add record: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormState & { id: string }) => {
      const { error } = await supabase
        .from("beneficiary_academics")
        .update({
          academic_year: parseInt(data.academic_year),
          term: data.term,
          overall_grade: data.overall_grade || null,
          total_marks: data.total_marks ? parseInt(data.total_marks) : null,
          out_of: data.out_of ? parseInt(data.out_of) : null,
          position: data.position ? parseInt(data.position) : null,
          remarks: data.remarks || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiary-academics", beneficiaryId] });
      toast.success("Academic record updated successfully");
      setIsDialogOpen(false);
      setEditingRecord(null);
      setFormData(initialFormState);
    },
    onError: (error) => {
      toast.error("Failed to update record: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("beneficiary_academics")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiary-academics", beneficiaryId] });
      toast.success("Academic record deleted");
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete record: " + error.message);
    },
  });

  const handleOpenDialog = (record?: AcademicRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        academic_year: record.academic_year.toString(),
        term: record.term,
        overall_grade: record.overall_grade || "",
        total_marks: record.total_marks?.toString() || "",
        out_of: record.out_of?.toString() || "",
        position: record.position?.toString() || "",
        remarks: record.remarks || "",
      });
    } else {
      setEditingRecord(null);
      setFormData(initialFormState);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.term) {
      toast.error("Please select a term");
      return;
    }
    if (editingRecord) {
      updateMutation.mutate({ ...formData, id: editingRecord.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Group records by academic year
  const groupedRecords = records.reduce((acc, record) => {
    const year = record.academic_year.toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(record);
    return acc;
  }, {} as Record<string, AcademicRecord[]>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Institution header strip */}
      {beneficiary && (() => {
        const institutionName = beneficiary.institution_name || "";
        const subParts = [
          beneficiary.institution_type,
          beneficiary.grade || beneficiary.academic_level,
          beneficiary.sub_county || beneficiary.county,
        ].filter(Boolean);

        const saveInstitution = async (newValue: any) => {
          if (!organizationId) return;
          await saveBeneficiaryField({
            beneficiaryId,
            organizationId,
            field: "institution_name",
            label: "Institution",
            newValue: newValue || null,
            oldValue: beneficiary.institution_name ?? null,
            userId: userId ?? null,
            applyLocal: (v) => onLocalUpdate?.({ institution_name: v }),
          });
        };

        return (
          <div
            className="rounded-[12px] p-4 flex items-start gap-3"
            style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border))" }}
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
            >
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {institutionName ? (
                  <InlineEditableField
                    bare
                    value={institutionName}
                    type="text"
                    canEdit={canEdit}
                    onSave={saveInstitution}
                    placeholder="Set institution"
                  />
                ) : canEdit ? (
                  <InlineEditableField
                    bare
                    value={null}
                    type="text"
                    canEdit={canEdit}
                    onSave={saveInstitution}
                    placeholder="No institution recorded — click to add"
                  />
                ) : (
                  <span className="text-muted-foreground italic font-normal">No institution recorded</span>
                )}
              </div>
              {subParts.length > 0 && (
                <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
                  {subParts.join(" · ")}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold text-primary">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info/20">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Grade</p>
                <p className="text-2xl font-bold text-info">
                  {records[0]?.overall_grade || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/20">
                <Award className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Academic Years</p>
                <p className="text-2xl font-bold text-success">{Object.keys(groupedRecords).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Section */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2 text-primary">
            <GraduationCap className="h-5 w-5" />
            Academic Records
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-primary">
                  {editingRecord ? "Edit Academic Record" : "Add Academic Record"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select 
                      value={formData.academic_year} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, academic_year: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_YEARS.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Term *</Label>
                    <Select 
                      value={formData.term} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, term: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {TERMS.map((term) => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Overall Grade</Label>
                  <Select 
                    value={formData.overall_grade} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, overall_grade: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Marks</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g., 350"
                      value={formData.total_marks}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_marks: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Out Of</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g., 500"
                      value={formData.out_of}
                      onChange={(e) => setFormData(prev => ({ ...prev, out_of: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g., 5"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea 
                    placeholder="Additional notes or teacher comments" 
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {editingRecord ? "Update" : "Add"} Record
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No academic records yet</p>
              <p className="text-sm">Click "Add Record" to start tracking performance</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRecords)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([year, yearRecords]) => (
                  <div key={year}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-primary">{year}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {yearRecords.length} record{yearRecords.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {yearRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="font-medium">
                              {record.term}
                            </Badge>
                            {record.overall_grade && (
                              <Badge className={getGradeColor(record.overall_grade)}>
                                Grade: {record.overall_grade}
                              </Badge>
                            )}
                            {record.total_marks !== null && record.out_of !== null && (
                              <span className="text-sm text-muted-foreground">
                                {record.total_marks}/{record.out_of}
                              </span>
                            )}
                            {record.position && (
                              <span className="text-sm text-muted-foreground">
                                Position: {record.position}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(record.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Academic Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this academic record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
