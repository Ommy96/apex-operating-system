import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const supportGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(255),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  facilitator: z.string().trim().max(255).optional().or(z.literal('')),
  team_leader_contact: z.string().trim().max(100).optional().or(z.literal('')),
  location: z.string().trim().max(255).optional().or(z.literal('')),
  meeting_schedule: z.string().trim().max(500).optional().or(z.literal('')),
  member_count: z.string().optional().or(z.literal('')),
});

interface SupportGroupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SupportGroupForm({ onSuccess, onCancel }: SupportGroupFormProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof supportGroupSchema>>({
    resolver: zodResolver(supportGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      facilitator: "",
      team_leader_contact: "",
      location: "",
      meeting_schedule: "",
      member_count: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof supportGroupSchema>) => {
    try {
      const { error } = await supabase
        .from('support_groups')
        .insert([{
          name: values.name,
          description: values.description || null,
          facilitator: values.facilitator || null,
          team_leader_contact: values.team_leader_contact || null,
          location: values.location || null,
          meeting_schedule: values.meeting_schedule || null,
          member_count: values.member_count ? parseInt(values.member_count) : null,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Support group created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating support group:', error);
      toast({
        title: "Error",
        description: "Failed to create support group",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="facilitator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Leader</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="team_leader_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Leader Contact</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Phone number or email" />
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
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="member_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member Count</FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meeting_schedule"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Meeting Schedule</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Every Tuesday at 2 PM" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Describe the support group's purpose and activities..." />
                </FormControl>
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
            {form.formState.isSubmitting ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
