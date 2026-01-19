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
import { useOrganization } from "@/hooks/useOrganization";

const selfEmpowermentSchema = z.object({
  applicant_id: z.string().max(100).optional().or(z.literal('')),
  full_name: z.string().trim().min(1, "Full name is required").max(255),
  gender: z.string().optional(),
  contact: z.string().max(50).optional().or(z.literal('')),
  residence: z.string().optional(),
  business_name: z.string().max(255).optional().or(z.literal('')),
  type_of_business: z.string().max(255).optional().or(z.literal('')),
  support_status: z.string().max(1000).optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  business_location: z.string().max(255).optional().or(z.literal('')),
  amount_requested: z.string().optional().or(z.literal('')),
  amount_approved: z.string().optional().or(z.literal('')),
  amount_status: z.string().optional(),
  current_status: z.string().max(1000).optional().or(z.literal('')),
  is_active: z.string(),
});

interface SelfEmpowermentFormProps {
  record?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SelfEmpowermentForm({ record, onSuccess, onCancel }: SelfEmpowermentFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const form = useForm<z.infer<typeof selfEmpowermentSchema>>({
    resolver: zodResolver(selfEmpowermentSchema),
    defaultValues: {
      applicant_id: record?.applicant_id || "",
      full_name: record?.full_name || "",
      gender: record?.gender || "",
      contact: record?.contact || "",
      residence: record?.residence || "",
      business_name: record?.business_name || "",
      type_of_business: record?.type_of_business || "",
      support_status: record?.support_status || "",
      start_date: record?.start_date || "",
      business_location: record?.business_location || "",
      amount_requested: record?.amount_requested?.toString() || "",
      amount_approved: record?.amount_approved?.toString() || "",
      amount_status: record?.amount_status || "",
      current_status: record?.current_status || "",
      is_active: record?.is_active !== undefined ? record.is_active.toString() : "true",
    },
  });

  const handleSubmit = async (values: z.infer<typeof selfEmpowermentSchema>) => {
    try {
      const dataToSave = {
        applicant_id: values.applicant_id || null,
        full_name: values.full_name,
        gender: values.gender as "Male" | "Female" | null || null,
        contact: values.contact || null,
        residence: values.residence as "Kibera" | "Kawangware" | "Diaspora" | "Outside Nairobi" | null || null,
        business_name: values.business_name || null,
        type_of_business: values.type_of_business || null,
        support_status: values.support_status || null,
        start_date: values.start_date || null,
        business_location: values.business_location || null,
        amount_requested: values.amount_requested ? parseFloat(values.amount_requested) : null,
        amount_approved: values.amount_approved ? parseFloat(values.amount_approved) : null,
        amount_status: values.amount_status as "Loan" | "Grant" | null || null,
        current_status: values.current_status || null,
        is_active: values.is_active === "true",
      };

      let error;
      if (record) {
        const result = await supabase
          .from('self_empowerment')
          .update(dataToSave)
          .eq('id', record.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('self_empowerment')
          .insert({ ...dataToSave, organization_id: currentOrganization?.organization_id });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: record ? "Self-empowerment application updated successfully" : "Self-empowerment application created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error with self-empowerment application:', error);
      toast({
        title: "Error",
        description: record ? "Failed to update self-empowerment application" : "Failed to create self-empowerment application",
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
              name="applicant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applicant ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select residence" />
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

            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type_of_business"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Business</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Location</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount_requested"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Requested</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount_approved"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Approved</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Loan">Loan</SelectItem>
                      <SelectItem value="Grant">Grant</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="support_status"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Support Status</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe current support status..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="current_status"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Current Status</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe current business status..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (record ? "Updating..." : "Creating...") : (record ? "Update Application" : "Create Application")}
            </Button>
          </div>
        </form>
      </Form>
    </ScrollArea>
  );
}
