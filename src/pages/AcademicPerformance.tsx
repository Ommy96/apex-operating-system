import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, BookOpen, TrendingUp, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const academicPerformanceSchema = z.object({
  child_id: z.string().min(1, 'Please select a child'),
  academic_grade: z.string().min(1, 'Please enter the academic grade/mark'),
  subject: z.string().optional(),
  assessment_date: z.string().min(1, 'Please enter the assessment date'),
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

export default function AcademicPerformance() {
  const { isAdmin } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<AcademicPerformanceFormData>({
    resolver: zodResolver(academicPerformanceSchema),
    defaultValues: {
      child_id: '',
      academic_grade: '',
      subject: '',
      assessment_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    fetchChildren();
  }, []);

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
      // For now, we'll create an activity record for academic performance
      // In a real system, you might want a separate academic_performance table
      const { error } = await supabase
        .from('activities')
        .insert({
          child_id: data.child_id,
          program_id: '9fe13aa8-d378-4a29-91e7-4252945acadc', // Education program UUID
          title: `Academic Performance - ${data.subject || 'General'}`,
          description: `Grade/Mark: ${data.academic_grade}${data.notes ? '\nNotes: ' + data.notes : ''}`,
          activity_date: data.assessment_date,
          outcome: data.academic_grade,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Academic performance record added successfully",
      });

      form.reset();
      setSelectedChild(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-secondary rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Academic Performance</h1>
            <p className="text-muted-foreground">Record and track children's academic progress</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/reports/academic-performance-reports')}
          className="gap-2"
          variant="outline"
        >
          <Eye className="h-4 w-4" />
          View Reports
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        {isAdmin && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Academic Performance Form
                </CardTitle>
                <CardDescription>
                  Record academic grades and performance for children
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Mathematics, English" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <FormField
                    control={form.control}
                    name="assessment_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Saving...' : 'Save Academic Record'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Info Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Academic Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
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
      </div>
    </div>
  );
}