import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { format } from "date-fns";

interface BeneficiaryAcademicsTabProps {
  beneficiaryId: string;
}

const formSchema = z.object({
  academic_year: z.coerce.number().min(2000, "Invalid year").max(2100, "Invalid year"),
  term: z.string().min(1, "Term is required"),
  overall_grade: z.string().optional(),
  total_marks: z.coerce.number().optional(),
  out_of: z.coerce.number().optional(),
  position: z.coerce.number().optional(),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const TERMS = ["Term 1", "Term 2", "Term 3"];

const GRADES = ["ME1", "ME2", "BE1", "BE2", "AE1", "AE2", "EE1", "EE2", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"];

const getGradeColor = (grade: string | null) => {
  if (!grade) return "bg-muted text-muted-foreground";
  const gradeUpper = grade.toUpperCase();
  if (gradeUpper.startsWith("ME") || gradeUpper.startsWith("A")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (gradeUpper.startsWith("BE") || gradeUpper.startsWith("B")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (gradeUpper.startsWith("AE") || gradeUpper.startsWith("C")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  if (gradeUpper.startsWith("EE") || gradeUpper.startsWith("D")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
};

export function BeneficiaryAcademicsTab({ beneficiaryId }: BeneficiaryAcademicsTabProps) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academic_year: currentYear,
      term: "",
      overall_grade: "",
      total_marks: undefined,
      out_of: undefined,
      position: undefined,
      remarks: "",
    },
  });

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
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("beneficiary_academics").insert({
        beneficiary_id: beneficiaryId,
        organization_id: currentOrganization?.organization_id,
        academic_year: data.academic_year,
        term: data.term,
        overall_grade: data.overall_grade || null,
        total_marks: data.total_marks || null,
        out_of: data.out_of || null,
        position: data.position || null,
        remarks: data.remarks || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiary-academics", beneficiaryId] });
      toast.success("Academic record added successfully");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error("Failed to add record: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData & { id: string }) => {
      const { error } = await supabase
        .from("beneficiary_academics")
        .update({
          academic_year: data.academic_year,
          term: data.term,
          overall_grade: data.overall_grade || null,
          total_marks: data.total_marks || null,
          out_of: data.out_of || null,
          position: data.position || null,
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
      form.reset();
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
      form.reset({
        academic_year: record.academic_year,
        term: record.term,
        overall_grade: record.overall_grade || "",
        total_marks: record.total_marks || undefined,
        out_of: record.out_of || undefined,
        position: record.position || undefined,
        remarks: record.remarks || "",
      });
    } else {
      setEditingRecord(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingRecord) {
      updateMutation.mutate({ ...data, id: editingRecord.id });
    } else {
      createMutation.mutate(data);
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

        <Card className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border-sky-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-sky-500/20">
                <TrendingUp className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Grade</p>
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {records[0]?.overall_grade || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/20">
                <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Academic Years</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Object.keys(groupedRecords).length}</p>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="academic_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year *</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ACADEMIC_YEARS.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="term"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Term *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select term" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TERMS.map((term) => (
                                <SelectItem key={term} value={term}>
                                  {term}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="overall_grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overall Grade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GRADES.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="total_marks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Marks</FormLabel>
                          <FormControl>
                            <input 
                              type="number" 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              placeholder="e.g., 350"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="out_of"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Out Of</FormLabel>
                          <FormControl>
                            <input 
                              type="number" 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              placeholder="e.g., 500"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <input 
                              type="number" 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              placeholder="e.g., 5"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes or teacher comments" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
              </Form>
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
