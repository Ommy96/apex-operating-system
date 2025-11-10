import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const medicalSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  location: z.string().optional(),
  gender: z.string().optional(),
  medical_condition: z.string().min(1, "Medical condition is required"),
  hospital: z.string().min(1, "Hospital is required"),
  doctors_report: z.string().optional(),
  outcome: z.string().optional(),
});

type MedicalFormData = z.infer<typeof medicalSchema>;

interface MedicalFormProps {
  record?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MedicalForm({ record, onSuccess, onCancel }: MedicalFormProps) {
  const { toast } = useToast();
  
  const form = useForm<MedicalFormData>({
    resolver: zodResolver(medicalSchema),
    defaultValues: {
      full_name: record?.full_name || "",
      location: record?.location || "",
      gender: record?.gender || "",
      medical_condition: record?.medical_condition || "",
      hospital: record?.hospital || "",
      doctors_report: record?.doctors_report || "",
      outcome: record?.outcome || "",
    },
  });

  const onSubmit = async (data: MedicalFormData) => {
    try {
      if (record) {
        const { error } = await supabase
          .from("medical_records")
          .update(data)
          .eq("id", record.id);

        if (error) throw error;
        toast({ title: "Medical record updated successfully" });
      } else {
        const { error } = await supabase
          .from("medical_records")
          .insert([data]);

        if (error) throw error;
        toast({ title: "Medical record added successfully" });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving medical record:", error);
      toast({
        title: "Error saving medical record",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
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
                  <SelectItem value="kibera">Kibera</SelectItem>
                  <SelectItem value="kawangware">Kawangware</SelectItem>
                  <SelectItem value="diaspora">Diaspora</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="medical_condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Condition</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the medical condition" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hospital"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hospital</FormLabel>
              <FormControl>
                <Input placeholder="Enter hospital name" {...field} />
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
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="doctors_report"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doctor's Report</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter doctor's report" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the outcome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {record ? "Update" : "Add"} Record
          </Button>
        </div>
      </form>
    </Form>
  );
}
