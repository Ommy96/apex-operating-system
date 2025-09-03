import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReplacementForm } from "@/components/ReplacementForm";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  FileDown,
  Trash2,
  Edit,
  User,
  RefreshCw,
  Shield
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { downloadExcel } from "@/lib/downloadUtils";

interface Replacement {
  id: string;
  original_child_id: string;
  new_child_full_name: string;
  new_child_gender: string;
  new_child_location: string;
  new_child_school: string;
  new_child_grade: string;
  replacement_date: string;
  reason: string;
  notes: string;
  created_at: string;
  original_child?: {
    first_name: string;
    last_name: string;
    gender: string;
    residence: string;
  };
}

export default function Replacements() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingReplacement, setEditingReplacement] = useState<Replacement | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied. Only administrators can view replacements.");
    }
  }, [isAdmin, navigate]);

  // Fetch replacements with original child data
  const { data: replacements = [], isLoading } = useQuery({
    queryKey: ["replacements"],
    queryFn: async () => {
      // First fetch all replacements
      const { data: replacementsData, error: replacementsError } = await supabase
        .from("replacements")
        .select("*")
        .order("replacement_date", { ascending: false });

      if (replacementsError) throw replacementsError;

      // Then fetch child details for each replacement
      const replacementsWithChildren = await Promise.all(
        (replacementsData || []).map(async (replacement) => {
          const { data: childData, error: childError } = await supabase
            .from("children")
            .select("first_name, last_name, gender, residence")
            .eq("id", replacement.original_child_id)
            .single();

          if (childError) {
            console.warn("Could not fetch child data for:", replacement.original_child_id);
            return {
              ...replacement,
              original_child: null
            };
          }

          return {
            ...replacement,
            original_child: childData
          };
        })
      );

      return replacementsWithChildren;
    },
  });

  // Delete replacement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("replacements")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replacements"] });
      toast.success("Replacement record deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete replacement record");
      console.error("Delete error:", error);
    },
  });

  // Filter replacements based on search and filters
  const filteredReplacements = replacements.filter((replacement) => {
    const matchesSearch = 
      replacement.new_child_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${replacement.original_child?.first_name} ${replacement.original_child?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSchool = !schoolFilter || schoolFilter === "all" || replacement.new_child_school === schoolFilter;
    const matchesGrade = !gradeFilter || gradeFilter === "all" || replacement.new_child_grade === gradeFilter;
    const matchesLocation = !locationFilter || locationFilter === "all" || replacement.new_child_location === locationFilter;

    return matchesSearch && matchesSchool && matchesGrade && matchesLocation;
  });

  // Get unique values for filters
  const uniqueSchools = [...new Set(replacements.map(r => r.new_child_school).filter(Boolean))];
  const uniqueGrades = [...new Set(replacements.map(r => r.new_child_grade).filter(Boolean))];
  const uniqueLocations = [...new Set(replacements.map(r => r.new_child_location).filter(Boolean))];

  const handleExport = () => {
    const exportData = filteredReplacements.map(replacement => ({
      "Original Child": `${replacement.original_child?.first_name} ${replacement.original_child?.last_name}`,
      "New Child": replacement.new_child_full_name,
      "Gender": replacement.new_child_gender,
      "Location": replacement.new_child_location,
      "School": replacement.new_child_school,
      "Grade": replacement.new_child_grade,
      "Replacement Date": new Date(replacement.replacement_date).toLocaleDateString(),
      "Reason": replacement.reason || "N/A",
      "Notes": replacement.notes || "N/A"
    }));

    downloadExcel(exportData, "replacements_report");
  };

  const handleEdit = (replacement: Replacement) => {
    setEditingReplacement(replacement);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingReplacement(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Child Replacements</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage child sponsorship replacements
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
          {isAdmin && (
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Replacement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingReplacement ? "Edit Replacement" : "Add New Replacement"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingReplacement 
                      ? "Update the replacement record details." 
                      : "Create a new child replacement record."
                    }
                  </DialogDescription>
                </DialogHeader>
                <ReplacementForm 
                  replacement={editingReplacement}
                  onSuccess={() => handleFormClose()}
                  onCancel={() => handleFormClose()}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Replacements</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{replacements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {replacements.filter(r => 
                new Date(r.replacement_date).getMonth() === new Date().getMonth() &&
                new Date(r.replacement_date).getFullYear() === new Date().getFullYear()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSchools.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueLocations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by child name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {uniqueSchools.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {uniqueGrades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Replacements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Replacement Records</CardTitle>
          <CardDescription>
            {filteredReplacements.length} of {replacements.length} replacements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original Child</TableHead>
                  <TableHead>New Child</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReplacements.map((replacement) => (
                  <TableRow key={replacement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          Replaced
                        </Badge>
                        <span className="font-medium">
                          {replacement.original_child?.first_name} {replacement.original_child?.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs bg-success text-success-foreground">
                          Active
                        </Badge>
                        <span className="font-medium">
                          {replacement.new_child_full_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{replacement.new_child_gender || "N/A"}</TableCell>
                    <TableCell>{replacement.new_child_location || "N/A"}</TableCell>
                    <TableCell>{replacement.new_child_school || "N/A"}</TableCell>
                    <TableCell>{replacement.new_child_grade || "N/A"}</TableCell>
                    <TableCell>
                      {new Date(replacement.replacement_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(replacement)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Replacement</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this replacement record? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(replacement.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredReplacements.length === 0 && (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No replacements found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || (schoolFilter !== "all") || (gradeFilter !== "all") || (locationFilter !== "all")
                  ? "Try adjusting your search or filters"
                  : "Get started by creating a new replacement record"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}