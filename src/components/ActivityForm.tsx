import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const activitySchema = z.object({
  activity_name: z.string().trim().min(1, "Activity name is required").max(255),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  frequency: z.string().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

interface ActivityFormProps {
  supportGroupId: string;
  activity?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ActivityForm({ supportGroupId, activity, onSuccess, onCancel }: ActivityFormProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_name: activity?.activity_name || "",
      description: activity?.description || "",
      frequency: activity?.frequency || "",
      notes: activity?.notes || "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof activitySchema>) => {
    try {
      if (activity) {
        // Update existing activity
        const { error } = await supabase
          .from('support_group_activities')
          .update({
            activity_name: values.activity_name,
            description: values.description || null,
            frequency: values.frequency || null,
            notes: values.notes || null,
          })
          .eq('id', activity.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Activity updated successfully",
        });
      } else {
        // Create new activity
        const { error } = await supabase
          .from('support_group_activities')
          .insert([{
            support_group_id: supportGroupId,
            activity_name: values.activity_name,
            description: values.description || null,
            frequency: values.frequency || null,
            notes: values.notes || null,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Activity added successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: "Error",
        description: `Failed to ${activity ? 'update' : 'add'} activity`,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="activity_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Weekly Fellowship, Table Banking" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Describe the activity and its purpose..." rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="How often does this activity occur?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="irregular">Irregular</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Additional notes or special instructions..." rows={2} />
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
            {form.formState.isSubmitting ? (activity ? "Updating..." : "Adding...") : (activity ? "Update Activity" : "Add Activity")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
