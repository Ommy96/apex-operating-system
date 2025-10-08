import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, BookOpen, TrendingUp, Eye, Plus, Search, Calendar, Download, User, BarChart3, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const academicPerformanceSchema = z.object({
  child_id: z.string().min(1, 'Please select a child'),
  academic_grade: z.string().min(1, 'Please enter the academic grade/mark'),
  year: z.string().min(1, 'Please select a year'),
  term: z.string().min(1, 'Please select a term/semester'),
  notes: z.string().optional(),
});

type AcademicPerformanceFormData = z.infer<typeof academicPerformanceSchema>;

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  institution_name: string | null;
}

interface AcademicPerformanceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingRecord?: any;
}

function AcademicPerformanceForm({ onSuccess, onCancel, editingRecord }: AcademicPerformanceFormProps) {
  const { isAdmin } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AcademicPerformanceFormData>({
    resolver: zodResolver(academicPerformanceSchema),
    defaultValues: {
      child_id: editingRecord?.child_id || '',
      academic_grade: editingRecord?.outcome || '',
      year: editingRecord?.activity_date ? new Date(editingRecord.activity_date).getFullYear().toString() : '',
      term: editingRecord?.description?.match(/Term: (Term [123])/)?.[1] || '',
      notes: editingRecord?.description?.split('\nNotes: ')[1] || '',
    },
  });

  useEffect(() => {
    fetchChildren();
    if (editingRecord && children.length > 0) {
      const child = children.find(c => c.id === editingRecord.child_id);
      setSelectedChild(child || null);
    }
  }, [editingRecord, children.length]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name, grade, institution_name')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
      toast({
        title: "Error",
        description: "Failed to fetch children data",
        variant: "destructive",
      });
    }
  };

  const onChildSelect = (childId: string) => {
    const child = children.find(c => c.id === childId);
    setSelectedChild(child || null);
    form.setValue('child_id', childId);
  };

  const onSubmit = async (data: AcademicPerformanceFormData) => {
    setLoading(true);
    try {
      const activityData = {
        child_id: data.child_id,
        program_id: '9fe13aa8-d378-4a29-91e7-4252945acadc', // Education program UUID
        title: 'Academic Performance',
        description: `Grade/Mark: ${data.academic_grade}\nYear: ${data.year}\nTerm: ${data.term}${data.notes ? '\nNotes: ' + data.notes : ''}`,
        activity_date: `${data.year}-01-01`, // Use year as a reference date
        outcome: data.academic_grade,
        term: data.term,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('activities')
          .insert(activityData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingRecord ? "Academic performance record updated successfully" : "Academic performance record added successfully",
      });

      form.reset();
      setSelectedChild(null);
      onSuccess();
    } catch (error) {
      console.error('Error saving academic performance:', error);
      toast({
        title: "Error",
        description: "Failed to save academic performance record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="shadow-soft border-destructive/20">
        <CardHeader className="bg-gradient-to-r from-destructive/5 to-destructive/10">
          <CardTitle className="flex items-center text-destructive">
            <GraduationCap className="h-5 w-5 mr-2" />
            Access Denied
          </CardTitle>
          <CardDescription>You don't have permission to add academic performance records. Only administrators can add records.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {editingRecord ? 'Edit Academic Performance' : 'Academic Performance Form'}
        </CardTitle>
        <CardDescription>
          {editingRecord ? 'Update academic performance record' : 'Record academic grades and performance for children'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="child_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Child Name</FormLabel>
                  <Select onValueChange={onChildSelect} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a child" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.first_name} {child.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedChild && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Child Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">School:</span>
                    <p className="font-medium">{selectedChild.institution_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grade:</span>
                    <p className="font-medium">{selectedChild.grade || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="academic_grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Grade/Mark</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., A, B+, 85%, 3.5 GPA" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
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
                    <FormLabel>Term/Semester</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Term 1">Term 1</SelectItem>
                        <SelectItem value="Term 2">Term 2</SelectItem>
                        <SelectItem value="Term 3">Term 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Any additional observations or comments" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Academic Record'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function AcademicPerformance() {
  const { isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch academic performance records
  const { data: academicRecords, refetch } = useQuery({
    queryKey: ['academic-performance-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          children (first_name, last_name, grade, institution_name)
        `)
        .like('title', 'Academic Performance%')
        .order('activity_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats for summary cards
  const { data: recordStats } = useQuery({
    queryKey: ['academic-performance-stats'],
    queryFn: async () => {
      const totalRecords = academicRecords?.length || 0;
      const thisMonth = academicRecords?.filter(record => {
        const recordDate = new Date(record.activity_date);
        const now = new Date();
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      }).length || 0;
      
      const uniqueStudents = new Set(academicRecords?.map(r => r.child_id) || []).size;
      const uniqueSchools = new Set(academicRecords?.map(r => r.children?.institution_name).filter(Boolean) || []).size;
      
      return { totalRecords, thisMonth, uniqueStudents, uniqueSchools };
    },
    enabled: !!academicRecords,
  });

  const filteredRecords = academicRecords?.filter(record => {
    const childName = record.children ? `${record.children.first_name} ${record.children.last_name}` : '';
    
    const matchesSearch = childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.outcome.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  };

  const handleDelete = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Academic performance record deleted successfully",
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete record. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-secondary rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Academic Performance</h1>
            <p className="text-muted-foreground">Record and track children's academic progress</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {!isStaff && (
            <Button 
              onClick={() => navigate('/reports/academic-performance-reports')}
              variant="outline"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Reports
            </Button>
          )}
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Performance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRecord ? 'Edit Academic Performance' : 'Add Academic Performance'}</DialogTitle>
                </DialogHeader>
                <AcademicPerformanceForm 
                  onSuccess={() => {
                    handleDialogClose();
                    refetch();
                  }} 
                  onCancel={handleDialogClose}
                  editingRecord={editingRecord}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name or grade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary to-primary-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Total Records</CardTitle>
            <BookOpen className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-foreground">{recordStats?.totalRecords || 0}</div>
            <p className="text-xs text-primary-foreground/80">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary-foreground">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-secondary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">{recordStats?.thisMonth || 0}</div>
            <p className="text-xs text-secondary-foreground/80">Records added</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent to-accent-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent-foreground">Schools</CardTitle>
            <BarChart3 className="h-4 w-4 text-accent-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{recordStats?.uniqueSchools || 0}</div>
            <p className="text-xs text-accent-foreground/80">Schools tracked</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary-light to-secondary-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Students</CardTitle>
            <User className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{recordStats?.uniqueStudents || 0}</div>
            <p className="text-xs text-white/80">Students tracked</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords?.map((record) => (
          <Card key={record.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">
                  {record.children ? `${record.children.first_name} ${record.children.last_name}` : 'Unknown Student'}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {(() => {
                      const year = record.description?.match(/Year: (\d+)/)?.[1];
                      const term = record.description?.match(/Term: (Term [123])/)?.[1];
                      return year && term ? `${year} - ${term}` : new Date(record.activity_date).toLocaleDateString();
                    })()}
                  </Badge>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <span className="sr-only">Actions</span>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(record)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Record</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this academic performance record? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(record.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Grade/Mark:</span>
                <Badge variant="default" className="font-bold">
                  {record.outcome}
                </Badge>
              </div>
              {(() => {
                const year = record.description?.match(/Year: (\d+)/)?.[1];
                const term = record.description?.match(/Term: (Term [123])/)?.[1];
                return year && term ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Academic Period:</span>
                    <Badge variant="outline">
                      {year} - {term}
                    </Badge>
                  </div>
                ) : null;
              })()}
              {record.children?.institution_name && (
                <div className="text-sm">
                  <strong>School:</strong> {record.children.institution_name}
                </div>
              )}
              {record.children?.grade && (
                <div className="text-sm">
                  <strong>Class:</strong> {record.children.grade}
                </div>
              )}
              {(() => {
                const notes = record.description?.split('Notes: ')[1]?.trim();
                return notes ? (
                  <div className="text-sm">
                    <strong>Notes:</strong> {notes.substring(0, 100)}{notes.length > 100 ? '...' : ''}
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecords?.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No academic performance records found.</p>
        </div>
      )}

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Academic Tracking Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Grade Systems Supported:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Letter grades (A, B, C, D, F)</li>
                <li>• Percentage scores (0-100%)</li>
                <li>• GPA scale (0.0-4.0)</li>
                <li>• Custom grading systems</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Track Progress:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Subject-specific performance</li>
                <li>• Term/semester progress</li>
                <li>• Improvement trends</li>
                <li>• Areas needing support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}