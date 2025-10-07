import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Save, Pencil, Trash2, Users, Calendar, BarChart3, Download } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKS = [1, 2, 3, 4, 5];

export default function AttendanceManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [program, setProgram] = useState("");
  const [month, setMonth] = useState("");
  const [week, setWeek] = useState("");
  const [presentCount, setPresentCount] = useState("");
  const [absentCount, setAbsentCount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Predefined programs (matching the Add Program Report form)
  const programs = [
    "Kibera Early dinner",
    "Kawangware Lunch Hour",
    "Kibera Kipawa Sato",
    "Kawangware Kipawa Sato",
    "Self Empowerment",
    "Support Groups",
    "Family Adoption",
    "Medical",
    "Education",
    "Rongai Sunday Feeding",
    "Kawangware Sunday Feeding",
    "Kibera Sunday Feeding"
  ];

  // Fetch attendance records
  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ["attendance-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      program_id: string;
      month: string;
      week: number;
      present_count: number;
      absent_count: number;
      recorded_by: string;
    }) => {
      if (editingId) {
        const { error } = await supabase
          .from("attendance_records")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("attendance_records")
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success(editingId ? "Attendance updated successfully" : "Attendance saved successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Error saving attendance: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success("Attendance record deleted");
    },
    onError: (error: Error) => {
      toast.error("Error deleting record: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!program || !month || !week || !presentCount || !absentCount) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to save attendance");
      return;
    }

    saveMutation.mutate({
      program_id: program,
      month,
      week: parseInt(week),
      present_count: parseInt(presentCount),
      absent_count: parseInt(absentCount),
      recorded_by: user.id,
    });
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setProgram(record.program_id);
    setMonth(record.month);
    setWeek(record.week.toString());
    setPresentCount(record.present_count.toString());
    setAbsentCount(record.absent_count.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const resetForm = () => {
    setEditingId(null);
    setProgram("");
    setMonth("");
    setWeek("");
    setPresentCount("");
    setAbsentCount("");
  };

  const handleDownload = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      toast.error("No data to download");
      return;
    }

    // Prepare data for Excel
    const exportData = attendanceRecords.map((record) => ({
      Program: record.program_id || "N/A",
      Month: record.month,
      Week: `Week ${record.week}`,
      Present: record.present_count,
      Absent: record.absent_count,
      Total: record.present_count + record.absent_count,
      "Recorded By": "Admin",
      Date: format(new Date(record.created_at), "MMM dd, yyyy"),
    }));

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Records");

    // Generate filename with current date
    const fileName = `Attendance_Records_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);
    toast.success("Attendance records downloaded successfully");
  };

  // Prepare chart data
  const chartData = attendanceRecords?.reduce((acc: any[], record: any) => {
    const programName = record.program_id || "Unknown";
    const existing = acc.find((item) => item.program === programName);
    
    if (existing) {
      existing.present += record.present_count;
      existing.absent += record.absent_count;
    } else {
      acc.push({
        program: programName,
        present: record.present_count,
        absent: record.absent_count,
      });
    }
    
    return acc;
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/reports/program-reports")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Program Reports
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Attendance Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Record and track program attendance data
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {editingId ? "Edit Attendance Record" : "Record New Attendance"}
          </CardTitle>
          <CardDescription>
            Select program, month, and week, then enter attendance counts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="program">Program *</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger id="program">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((prog) => (
                    <SelectItem key={prog} value={prog}>
                      {prog}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Month *</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="week">Week *</Label>
              <Select value={week} onValueChange={setWeek}>
                <SelectTrigger id="week">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKS.map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="present">Beneficiaries Present *</Label>
              <Input
                id="present"
                type="number"
                min="0"
                value={presentCount}
                onChange={(e) => setPresentCount(e.target.value)}
                placeholder="Enter count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="absent">Beneficiaries Absent *</Label>
              <Input
                id="absent"
                type="number"
                min="0"
                value={absentCount}
                onChange={(e) => setAbsentCount(e.target.value)}
                placeholder="Enter count"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? "Update" : "Save"} Attendance
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Attendance Chart */}
      {chartData && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attendance Overview by Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="program" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="hsl(var(--primary))" name="Present" />
                <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>View and manage all attendance entries</CardDescription>
            </div>
            <Button onClick={handleDownload} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading records...</p>
          ) : attendanceRecords && attendanceRecords.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.program_id || "N/A"}
                      </TableCell>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>Week {record.week}</TableCell>
                      <TableCell className="text-center text-primary font-semibold">
                        {record.present_count}
                      </TableCell>
                      <TableCell className="text-center text-destructive font-semibold">
                        {record.absent_count}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {record.present_count + record.absent_count}
                      </TableCell>
                      <TableCell>Admin</TableCell>
                      <TableCell>
                        {format(new Date(record.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Attendance Record?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete
                                  the attendance record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(record.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No attendance records yet. Create your first record above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}