import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface GroupVisitFormProps {
  groupId?: string;
  visit?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GroupVisitForm({ groupId, visit, onSuccess, onCancel }: GroupVisitFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    activity_name: visit?.activity_name || '',
    description: visit?.description || '',
    frequency: visit?.frequency || '',
    notes: visit?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) {
      toast({ title: "Group ID is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        support_group_id: groupId,
        created_by: user?.id || null,
      };

      if (visit?.id) {
        const { error } = await supabase
          .from('support_group_activities')
          .update(payload)
          .eq('id', visit.id);
        if (error) throw error;
        toast({ title: "Activity updated successfully" });
      } else {
        const { error } = await supabase
          .from('support_group_activities')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Activity recorded successfully" });
      }
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error saving activity", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="activity_name">Activity Name *</Label>
        <Input
          id="activity_name"
          value={formData.activity_name}
          onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
          placeholder="Enter activity name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="frequency">Frequency</Label>
        <Select
          value={formData.frequency}
          onValueChange={(value) => setFormData({ ...formData, frequency: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Weekly">Weekly</SelectItem>
            <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Quarterly">Quarterly</SelectItem>
            <SelectItem value="One-time">One-time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the activity"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add notes"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : visit ? 'Update Activity' : 'Add Activity'}
        </Button>
      </div>
    </form>
  );
}
