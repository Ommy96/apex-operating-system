import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowRight, GraduationCap, Users, AlertCircle, CheckCircle2 } from "lucide-react";

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  academic_level: string | null;
}

interface ProgressionPreview {
  currentGrade: string;
  nextGrade: string | null;
  willGraduate: boolean;
  students: Child[];
}

const getNextGrade = (currentGrade: string | null, academicLevel: string | null): { nextGrade: string | null; nextLevel: string | null; willGraduate: boolean } => {
  if (!currentGrade && !academicLevel) {
    return { nextGrade: null, nextLevel: null, willGraduate: false };
  }

  // Pre Primary: Play Group → PP1 → PP2 → Grade 1
  if (currentGrade === "Play Group") {
    return { nextGrade: "PP1", nextLevel: "Pre Primary", willGraduate: false };
  }
  if (currentGrade === "PP1") {
    return { nextGrade: "PP2", nextLevel: "Pre Primary", willGraduate: false };
  }
  if (currentGrade === "PP2") {
    return { nextGrade: "Grade 1", nextLevel: "Lower Primary", willGraduate: false };
  }

  // Lower Primary: Grade 1 → 2 → 3 → Grade 4
  if (currentGrade === "Grade 1") {
    return { nextGrade: "Grade 2", nextLevel: "Lower Primary", willGraduate: false };
  }
  if (currentGrade === "Grade 2") {
    return { nextGrade: "Grade 3", nextLevel: "Lower Primary", willGraduate: false };
  }
  if (currentGrade === "Grade 3") {
    return { nextGrade: "Grade 4", nextLevel: "Upper Primary", willGraduate: false };
  }

  // Upper Primary: Grade 4 → 5 → 6 → Grade 7
  if (currentGrade === "Grade 4") {
    return { nextGrade: "Grade 5", nextLevel: "Upper Primary", willGraduate: false };
  }
  if (currentGrade === "Grade 5") {
    return { nextGrade: "Grade 6", nextLevel: "Upper Primary", willGraduate: false };
  }
  if (currentGrade === "Grade 6") {
    return { nextGrade: "Grade 7", nextLevel: "Junior Secondary School", willGraduate: false };
  }

  // Junior Secondary School: Grade 7 → 8 → 9 → Grade 10
  if (currentGrade === "Grade 7") {
    return { nextGrade: "Grade 8", nextLevel: "Junior Secondary School", willGraduate: false };
  }
  if (currentGrade === "Grade 8") {
    return { nextGrade: "Grade 9", nextLevel: "Junior Secondary School", willGraduate: false };
  }
  if (currentGrade === "Grade 9") {
    return { nextGrade: "Grade 10", nextLevel: "Secondary School", willGraduate: false };
  }

  // Senior School: Grade 10 → 11 → 12 → Graduate/Tertiary
  if (currentGrade === "Grade 10") {
    return { nextGrade: "Grade 11", nextLevel: "Secondary School", willGraduate: false };
  }
  if (currentGrade === "Grade 11") {
    return { nextGrade: "Grade 12", nextLevel: "Secondary School", willGraduate: false };
  }
  if (currentGrade === "Grade 12") {
    return { nextGrade: null, nextLevel: null, willGraduate: true }; // Graduate to Alumni
  }

  // Secondary School: Form 2 → 3 → 4 → Graduate
  if (currentGrade === "Form 2") {
    return { nextGrade: "Form 3", nextLevel: "Secondary School", willGraduate: false };
  }
  if (currentGrade === "Form 3") {
    return { nextGrade: "Form 4", nextLevel: "Secondary School", willGraduate: false };
  }
  if (currentGrade === "Form 4") {
    return { nextGrade: null, nextLevel: null, willGraduate: true }; // Graduate to Alumni
  }

  // Tertiary: 1st Year → 2nd → 3rd → 4th → Graduate
  if (currentGrade === "1st Year") {
    return { nextGrade: "2nd Year", nextLevel: "Tertiary", willGraduate: false };
  }
  if (currentGrade === "2nd Year") {
    return { nextGrade: "3rd Year", nextLevel: "Tertiary", willGraduate: false };
  }
  if (currentGrade === "3rd Year") {
    return { nextGrade: "4th Year", nextLevel: "Tertiary", willGraduate: false };
  }
  if (currentGrade === "4th Year") {
    return { nextGrade: null, nextLevel: null, willGraduate: true }; // Graduate to Alumni
  }

  return { nextGrade: null, nextLevel: null, willGraduate: false };
};

export default function GradeProgression() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressionComplete, setProgressionComplete] = useState(false);

  // Redirect non-admin users
  if (userRole !== "admin") {
    navigate("/dashboard");
    return null;
  }

  // Fetch all active children
  const { data: children, isLoading } = useQuery({
    queryKey: ["children-for-progression"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("id, first_name, last_name, grade, academic_level")
        .eq("status", "active")
        .order("grade");

      if (error) throw error;
      return data as Child[];
    },
  });

  // Group children by progression outcome
  const progressionPreview: ProgressionPreview[] = [];
  const graduatingStudents: Child[] = [];

  if (children) {
    const grouped = new Map<string, Child[]>();

    children.forEach((child) => {
      const key = `${child.academic_level || "unknown"}-${child.grade || "unknown"}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(child);
    });

    grouped.forEach((students, key) => {
      const firstStudent = students[0];
      const { nextGrade, willGraduate } = getNextGrade(firstStudent.grade, firstStudent.academic_level);

      if (willGraduate) {
        graduatingStudents.push(...students);
      } else {
        progressionPreview.push({
          currentGrade: firstStudent.grade || "Unknown",
          nextGrade,
          willGraduate,
          students,
        });
      }
    });
  }

  const progressMutation = useMutation({
    mutationFn: async () => {
      if (!children) return;

      const updates: any[] = [];
      const historyRecords: any[] = [];
      const alumniRecords: any[] = [];

      for (const child of children) {
        const { nextGrade, nextLevel, willGraduate } = getNextGrade(child.grade, child.academic_level);

        if (willGraduate) {
          // Create alumni record
          alumniRecords.push({
            full_name: `${child.first_name} ${child.last_name}`,
            graduation_year: parseInt(academicYear),
            exit_year: parseInt(academicYear),
            created_by: user?.id,
          });

          // Update child status to inactive
          updates.push({
            id: child.id,
            status: "inactive",
          });
        } else if (nextGrade) {
          // Update grade
          updates.push({
            id: child.id,
            grade: nextGrade,
            academic_level: nextLevel,
          });
        }

        // Record in academic history
        historyRecords.push({
          child_id: child.id,
          academic_year: academicYear,
          previous_grade: child.grade,
          new_grade: willGraduate ? "Graduated" : nextGrade,
          previous_academic_level: child.academic_level,
          new_academic_level: willGraduate ? null : nextLevel,
          created_by: user?.id,
          notes: willGraduate ? "Graduated to Alumni" : "Annual progression",
        });
      }

      // Execute updates
      if (updates.length > 0) {
        for (const update of updates) {
          const { error } = await supabase
            .from("children")
            .update({
              grade: update.grade,
              academic_level: update.academic_level,
              status: update.status,
            })
            .eq("id", update.id);

          if (error) throw error;
        }
      }

      // Insert alumni records
      if (alumniRecords.length > 0) {
        const { error } = await supabase.from("alumni").insert(alumniRecords);
        if (error) throw error;
      }

      // Insert history records
      if (historyRecords.length > 0) {
        const { error } = await supabase.from("academic_history").insert(historyRecords);
        if (error) throw error;
      }

      return {
        updated: updates.length - alumniRecords.length,
        graduated: alumniRecords.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["children-for-progression"] });
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      setProgressionComplete(true);
      toast.success(`Grade progression complete! ${result?.updated || 0} students promoted, ${result?.graduated || 0} graduated to Alumni.`);
    },
    onError: (error) => {
      toast.error("Failed to process grade progression: " + error.message);
    },
  });

  const handleProgressStudents = async () => {
    if (!academicYear) {
      toast.error("Please enter an academic year");
      return;
    }

    setIsProcessing(true);
    await progressMutation.mutateAsync();
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading students...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Grade Progression Tool</h1>
          <p className="text-muted-foreground mt-1">Promote all students to the next academic level</p>
        </div>
      </div>

      {progressionComplete ? (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Grade progression completed successfully! All students have been promoted to their next academic level.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Academic Year</CardTitle>
              <CardDescription>Enter the academic year for this progression</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1 max-w-xs">
                    <Label htmlFor="academic-year">Academic Year</Label>
                    <Input
                      id="academic-year"
                      type="number"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2024"
                      min="2000"
                      max="2100"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Progression Preview
              </CardTitle>
              <CardDescription>Review which students will be promoted to the next grade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {progressionPreview.length === 0 && graduatingStudents.length === 0 ? (
                <p className="text-muted-foreground">No active students found to progress.</p>
              ) : (
                <>
                  {progressionPreview.map((preview, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{preview.currentGrade}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-primary">{preview.nextGrade}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{preview.students.length} students</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {preview.students.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}
                      </div>
                    </div>
                  ))}

                  {graduatingStudents.length > 0 && (
                    <>
                      <Separator />
                      <div className="border rounded-lg p-4 space-y-2 bg-accent/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Graduating to Alumni</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{graduatingStudents.length} students</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {graduatingStudents.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {(progressionPreview.length > 0 || graduatingStudents.length > 0) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This action will promote {children?.length || 0} students. Form 4 and 4th Year Tertiary students will be
                moved to Alumni. This cannot be undone easily.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleProgressStudents}
              disabled={isProcessing || !children || children.length === 0}
              size="lg"
            >
              {isProcessing ? "Processing..." : "Confirm and Progress All Students"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/children")} size="lg">
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
