import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActivityFormProps {
  supportGroupId: string;
  activity?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ActivityForm({ supportGroupId, activity, onSuccess, onCancel }: ActivityFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    activity_name: activity?.activity_name || "",
    description: activity?.description || "",
    frequency: activity?.frequency || "",
    notes: activity?.notes || "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (activity) {
        // Update existing activity
        const { error } = await supabase
          .from('support_group_activities')
          .update({
            activity_name: formData.activity_name,
            description: formData.description || null,
            frequency: formData.frequency || null,
            notes: formData.notes || null,
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
            activity_name: formData.activity_name,
            description: formData.description || null,
            frequency: formData.frequency || null,
            notes: formData.notes || null,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="activity_name">Activity Name *</Label>
        <Input
          id="activity_name"
          value={formData.activity_name}
          onChange={(e) => handleInputChange('activity_name', e.target.value)}
          placeholder="e.g., Weekly Fellowship, Table Banking"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe the activity and its purpose..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="frequency">Frequency</Label>
        <Select 
          value={formData.frequency} 
          onValueChange={(value) => handleInputChange('frequency', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="How often does this activity occur?" />
          </SelectTrigger>
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
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Additional notes or special instructions..."
          rows={2}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (activity ? "Updating..." : "Adding...") : (activity ? "Update Activity" : "Add Activity")}
        </Button>
      </div>
    </form>
  );
}