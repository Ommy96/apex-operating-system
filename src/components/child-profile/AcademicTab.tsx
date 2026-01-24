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
import { Input } from "@/components/ui/input";
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

interface AcademicTabProps {
  childId: string;
}

const formSchema = z.object({
  academic_year: z.string().min(1, "Academic year is required"),
  term: z.string().min(1, "Term is required"),
  subject: z.string().optional(),
  score: z.string().optional(),
  grade: z.string().optional(),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AcademicRecord {
  id: string;
  child_id: string;
  organization_id: string;
  academic_year: string;
  term: string;
  subject: string | null;
  score: number | null;
  grade: string | null;
  remarks: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

const ACADEMIC_YEARS = [
  "2024",
  "2025",
  "2026",
];

const TERMS = ["Term 1", "Term 2", "Term 3"];

const GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E", "ME1", "ME2", "BE1", "BE2", "AE1", "AE2", "EE1", "EE2"];

const getGradeColor = (grade: string | null) => {
  if (!grade) return "bg-muted text-muted-foreground";
  const gradeUpper = grade.toUpperCase();
  if (gradeUpper.startsWith("A")) return "bg-success/20 text-success-foreground dark:bg-success/30";
  if (gradeUpper.startsWith("B")) return "bg-primary/20 text-primary-foreground dark:bg-primary/30";
  if (gradeUpper.startsWith("C")) return "bg-warning/20 text-warning-foreground dark:bg-warning/30";
  if (gradeUpper.startsWith("D")) return "bg-accent/20 text-accent-foreground dark:bg-accent/30";
  return "bg-destructive/20 text-destructive-foreground dark:bg-destructive/30";
};

export function AcademicTab({ childId }: AcademicTabProps) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academic_year: "",
      term: "",
      subject: "",
      score: "",
      grade: "",
      remarks: "",
    },
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["academic-performance", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_performance")
        .select("*")
        .eq("child_id", childId)
        .order("academic_year", { ascending: false })
        .order("term", { ascending: false });

      if (error) throw error;
      return data as AcademicRecord[];
    },
    enabled: !!childId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("academic_performance").insert({
        child_id: childId,
        organization_id: currentOrganization?.organization_id,
        academic_year: data.academic_year,
        term: data.term,
        subject: data.subject || null,
        score: data.score ? parseFloat(data.score) : null,
        grade: data.grade || null,
        remarks: data.remarks || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-performance", childId] });
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
        .from("academic_performance")
        .update({
          academic_year: data.academic_year,
          term: data.term,
          subject: data.subject || null,
          score: data.score ? parseFloat(data.score) : null,
          grade: data.grade || null,
          remarks: data.remarks || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-performance", childId] });
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
        .from("academic_performance")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-performance", childId] });
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
        subject: record.subject || "",
        score: record.score?.toString() || "",
        grade: record.grade || "",
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
    const year = record.academic_year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(record);
    return acc;
  }, {} as Record<string, AcademicRecord[]>);

  // Calculate summary stats
  const latestYear = Object.keys(groupedRecords).sort().reverse()[0];
  const latestRecords = groupedRecords[latestYear] || [];
  const avgScore = latestRecords.length > 0
    ? latestRecords.filter(r => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) / 
      latestRecords.filter(r => r.score !== null).length
    : null;

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
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-accent/20">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Score ({latestYear || 'N/A'})</p>
                <p className="text-2xl font-bold">
                  {avgScore !== null ? avgScore.toFixed(1) + '%' : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/20">
                <Award className="h-5 w-5 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Academic Years</p>
                <p className="text-2xl font-bold">{Object.keys(groupedRecords).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Academic Records
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
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
                          <FormLabel>Academic Year *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ACADEMIC_YEARS.map((year) => (
                                <SelectItem key={year} value={year}>
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
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mathematics, Overall" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Score (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              placeholder="e.g., 85" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
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
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([year, yearRecords]) => (
                  <div key={year}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold text-lg">{year}</h4>
                      <Badge variant="secondary">{yearRecords.length} records</Badge>
                    </div>
                    <div className="grid gap-3">
                      {yearRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{record.term}</Badge>
                            <div>
                              <p className="font-medium">
                                {record.subject || "Overall Performance"}
                              </p>
                              {record.remarks && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {record.remarks}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {record.score !== null && (
                              <span className="text-lg font-semibold">
                                {record.score}%
                              </span>
                            )}
                            {record.grade && (
                              <Badge className={getGradeColor(record.grade)}>
                                {record.grade}
                              </Badge>
                            )}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(record)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(record.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
            <AlertDialogTitle>Delete Academic Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this academic record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
