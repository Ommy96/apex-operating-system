import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SupportGroupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SupportGroupForm({ onSuccess, onCancel }: SupportGroupFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    facilitator: "",
    team_leader_contact: "",
    location: "",
    meeting_schedule: "",
    member_count: "",
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
      const { error } = await supabase
        .from('support_groups')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          facilitator: formData.facilitator || null,
          team_leader_contact: formData.team_leader_contact || null,
          location: formData.location || null,
          meeting_schedule: formData.meeting_schedule || null,
          member_count: formData.member_count ? parseInt(formData.member_count) : null,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Group Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="facilitator">Team Leader</Label>
          <Input
            id="facilitator"
            value={formData.facilitator}
            onChange={(e) => handleInputChange('facilitator', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="team_leader_contact">Team Leader Contact</Label>
          <Input
            id="team_leader_contact"
            value={formData.team_leader_contact}
            onChange={(e) => handleInputChange('team_leader_contact', e.target.value)}
            placeholder="Phone number or email"
          />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="member_count">Member Count</Label>
          <Input
            id="member_count"
            type="number"
            value={formData.member_count}
            onChange={(e) => handleInputChange('member_count', e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="meeting_schedule">Meeting Schedule</Label>
          <Input
            id="meeting_schedule"
            value={formData.meeting_schedule}
            onChange={(e) => handleInputChange('meeting_schedule', e.target.value)}
            placeholder="e.g., Every Tuesday at 2 PM"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the support group's purpose and activities..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </form>
  );
}