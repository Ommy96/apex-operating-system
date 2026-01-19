import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

const homeVisitSchema = z.object({
  staff: z.string().trim().min(1, "Staff name is required").max(255),
  visit_date: z.string().min(1, "Visit date is required"),
  student_id: z.string().optional(),
  location: z.string().optional(),
  reason_for_visit: z.string().optional(),
  observation_findings: z.string().trim().min(10, "Observations must be at least 10 characters").max(5000),
  challenges_identified: z.string().trim().min(10, "Challenges must be at least 10 characters").max(5000),
  recommendations: z.string().trim().min(10, "Recommendations must be at least 10 characters").max(5000),
});

interface HomeVisitReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function HomeVisitReportForm({ onSuccess, onCancel, initialData }: HomeVisitReportFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isAddingNewStudent, setIsAddingNewStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  
  const form = useForm<z.infer<typeof homeVisitSchema>>({
    resolver: zodResolver(homeVisitSchema),
    defaultValues: {
      staff: initialData?.staff || "",
      visit_date: initialData?.visit_date || "",
      student_id: initialData?.student_id || "",
      location: initialData?.location || "",
      reason_for_visit: initialData?.reason_for_visit || "",
      observation_findings: initialData?.observation_findings || "",
      challenges_identified: initialData?.challenges_identified || "",
      recommendations: initialData?.recommendations || "",
    },
  });

  // Fetch students for the dropdown
  const { data: students = [] } = useQuery({
    queryKey: ['students', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('organization_id', currentOrganization.organization_id)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const handleSubmit = async (values: z.infer<typeof homeVisitSchema>) => {
    try {
      let studentId = values.student_id;

      // If adding a new student, create the student first
      if (isAddingNewStudent && newStudentName.trim()) {
        const nameParts = newStudentName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const { data: newStudent, error: studentError } = await supabase
          .from('children')
          .insert({
            first_name: firstName,
            last_name: lastName,
            status: 'active',
            organization_id: currentOrganization?.organization_id
          })
          .select('id')
          .single();

        if (studentError) throw studentError;
        studentId = newStudent.id;
      }

      if (initialData) {
        // Update existing report
        const { error } = await supabase
          .from('home_visit_reports')
          .update({
            ...values,
            student_id: studentId || null,
            location: values.location as "Kibera" | "Kawangware" | "Diaspora" | "Outside Nairobi" | null || null,
          })
          .eq('id', initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Home visit report updated successfully",
        });
      } else {
        // Create new report
        const { error } = await supabase
          .from('home_visit_reports')
          .insert({
            ...values,
            student_id: studentId || null,
            location: values.location as "Kibera" | "Kawangware" | "Diaspora" | "Outside Nairobi" | null || null,
            created_by: user?.id,
            organization_id: currentOrganization?.organization_id,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Home visit report created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating home visit report:', error);
      toast({
        title: "Error",
        description: "Failed to create home visit report",
        variant: "destructive",
      });
    }
  };

  return (
    <ScrollArea className="h-[80vh]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="staff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter staff name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visit_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visit Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Name</FormLabel>
                  {isAddingNewStudent ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter student full name"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setIsAddingNewStudent(false);
                            setNewStudentName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => {
                        if (value === "add_new") {
                          setIsAddingNewStudent(true);
                          field.onChange('');
                        } else {
                          field.onChange(value);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="add_new">
                          <div className="flex items-center">
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Student
                          </div>
                        </SelectItem>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.first_name} {student.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Kibera">Kibera</SelectItem>
                      <SelectItem value="Kawangware">Kawangware</SelectItem>
                      <SelectItem value="Diaspora">Diaspora</SelectItem>
                      <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reason_for_visit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Visit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason for visit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="General Visit">General Visit</SelectItem>
                    <SelectItem value="Follow-Up">Follow-Up</SelectItem>
                    <SelectItem value="Emergency Visit">Emergency Visit</SelectItem>
                    <SelectItem value="New Intake">New Intake</SelectItem>
                    <SelectItem value="Information Required">Information Required</SelectItem>
                    <SelectItem value="Visitor/Donor Visit">Visitor/Donor Visit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observation_findings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observation Findings *</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Document your observations during the visit..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="challenges_identified"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Challenges Identified *</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="List any challenges or concerns identified..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recommendations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recommendations *</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Provide recommendations for follow-up actions..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update Report" : "Create Report")}
            </Button>
          </div>
        </form>
      </Form>
    </ScrollArea>
  );
}