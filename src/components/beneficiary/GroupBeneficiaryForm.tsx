import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { X, Users, MapPin, Calendar, UserPlus, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { DonorManager } from "./DonorManager";
import { ProgramEnrollmentSection } from "./ProgramEnrollmentSection";

const RESIDENCE_OPTIONS = [
  "Kayole", "Dandora", "Mathare", "Korogocho", "Mukuru", 
  "Kibera", "Kawangware", "Kangemi", "Other"
];

const ACTIVITY_SUGGESTIONS = [
  "Psychosocial Support", "Health Education", "Skills Training",
  "Peer Support", "Counseling", "Advocacy", "Livelihood Support",
  "Youth Mentorship", "Women Empowerment", "Child Protection"
];

const groupFormSchema = z.object({
  group_name: z.string().min(2, "Group name is required"),
  location: z.string().optional(),
  member_count: z.number().min(1, "At least 1 member required").optional(),
  leader_name: z.string().optional(),
  leader_phone: z.string().optional(),
  group_schedule: z.string().optional(),
  group_activities: z.array(z.string()).optional(),
  status: z.string(),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

interface Donor {
  donor_name: string;
  amount_received: number | null;
  donation_date: string;
  notes: string;
}

interface GroupBeneficiaryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GroupBeneficiaryForm({ onSuccess, onCancel }: GroupBeneficiaryFormProps) {
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [donors, setDonors] = useState<Donor[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState("");
  const [enrollments, setEnrollments] = useState<any[]>([]);

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      group_name: "",
      location: "",
      member_count: undefined,
      leader_name: "",
      leader_phone: "",
      group_schedule: "",
      group_activities: [],
      status: "active",
    },
  });

  const addActivity = (activity: string) => {
    if (activity && !activities.includes(activity)) {
      setActivities([...activities, activity]);
      setNewActivity("");
    }
  };

  const removeActivity = (activity: string) => {
    setActivities(activities.filter(a => a !== activity));
  };

  const onSubmit = async (data: GroupFormData) => {
    if (!currentOrganization?.organization_id) {
      toast.error("No organization selected");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert beneficiary record
      const beneficiaryData: any = {
        beneficiary_type: 'group',
        display_name: data.group_name,
        group_name: data.group_name,
        location: data.location || null,
        member_count: data.member_count || null,
        leader_name: data.leader_name || null,
        leader_phone: data.leader_phone || null,
        group_schedule: data.group_schedule || null,
        group_activities: activities.length > 0 ? activities : null,
        status: data.status,
        organization_id: currentOrganization.organization_id,
      };

      const { data: beneficiary, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .insert(beneficiaryData)
        .select()
        .single();

      if (beneficiaryError) throw beneficiaryError;

      // Insert donors if any
      if (donors.length > 0) {
        const donorRecords = donors.map(donor => ({
          beneficiary_id: beneficiary.id,
          organization_id: currentOrganization.organization_id,
          donor_name: donor.donor_name,
          amount_received: donor.amount_received || null,
          donation_date: donor.donation_date || null,
          notes: donor.notes || null,
        }));

        const { error: donorError } = await supabase
          .from('beneficiary_donors')
          .insert(donorRecords);

        if (donorError) throw donorError;
      }

      toast.success("Group beneficiary registered successfully!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating group beneficiary:", error);
      toast.error(error.message || "Failed to register group beneficiary");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Register Group Beneficiary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Group Details</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="donors">Donors</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="group_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Kayole Youth Support Group" {...field} />
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
                            {RESIDENCE_OPTIONS.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="member_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Members</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            placeholder="e.g., 25" 
                            {...field}
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="group_schedule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Schedule</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Every Saturday 2:00 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Group Leadership
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leader_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leader Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name of group leader" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="leader_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leader Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 0712345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="activities" className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div>
                    <Label>Group Activities</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Select from suggestions or add custom activities
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {ACTIVITY_SUGGESTIONS.filter(a => !activities.includes(a)).map(activity => (
                        <Badge 
                          key={activity} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => addActivity(activity)}
                        >
                          + {activity}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom activity..."
                        value={newActivity}
                        onChange={e => setNewActivity(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addActivity(newActivity);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => addActivity(newActivity)}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {activities.length > 0 && (
                    <div>
                      <Label>Selected Activities ({activities.length})</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {activities.map(activity => (
                          <Badge key={activity} variant="secondary" className="gap-1">
                            {activity}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => removeActivity(activity)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="donors" className="pt-4">
                <DonorManager donors={donors} onChange={setDonors} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register Group"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
