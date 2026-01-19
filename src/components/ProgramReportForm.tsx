import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useOrganization } from "@/hooks/useOrganization";

const programReportSchema = z.object({
  program: z.string().min(1, "Program is required").max(100),
  staff: z.string().min(1, "Staff member is required").max(255),
  reporting_date: z.string().min(1, "Reporting date is required"),
  executive_summary: z.string().min(10, "Executive summary must be at least 10 characters").max(5000),
  beneficiary_impact: z.string().min(10, "Beneficiary impact must be at least 10 characters").max(5000),
  challenges: z.string().min(10, "Challenges must be at least 10 characters").max(5000),
  proposed_recommendations: z.string().min(10, "Recommendations must be at least 10 characters").max(5000),
});

interface ProgramReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function ProgramReportForm({ onSuccess, onCancel, initialData }: ProgramReportFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof programReportSchema>>({
    resolver: zodResolver(programReportSchema),
    defaultValues: {
      program: initialData?.program || "",
      staff: initialData?.staff || "",
      reporting_date: initialData?.reporting_date || "",
      executive_summary: initialData?.executive_summary || "",
      beneficiary_impact: initialData?.beneficiary_impact || "",
      challenges: initialData?.challenges || "",
      proposed_recommendations: initialData?.proposed_recommendations || "",
    },
  });

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

  const handleSubmit = async (values: z.infer<typeof programReportSchema>) => {
    setIsSubmitting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (initialData) {
        const { error } = await supabase
          .from('program_reports')
          .update({
            ...values,
            program: values.program as any,
          })
          .eq('id', initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Program report updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('program_reports')
          .insert({
            ...values,
            program: values.program as any,
            created_by: user.id,
            organization_id: currentOrganization?.organization_id,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Program report created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving program report:', error);
      toast({
        title: "Error",
        description: "Failed to save program report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-[80vh]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="program"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program} value={program}>
                          {program}
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
              name="staff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reporting_date"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reporting Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="executive_summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Executive Summary *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Provide a high-level summary of the program's performance..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="beneficiary_impact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beneficiary Impact *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Describe the impact on program beneficiaries..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="challenges"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Challenges *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="List challenges encountered during the reporting period..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="proposed_recommendations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proposed Recommendations *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Provide recommendations for program improvement..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update Report" : "Create Report")}
            </Button>
          </div>
        </form>
      </Form>
    </ScrollArea>
  );
}
