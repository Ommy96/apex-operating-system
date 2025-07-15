import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SelfEmpowermentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SelfEmpowermentForm({ onSuccess, onCancel }: SelfEmpowermentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicant_id: "",
    full_name: "",
    gender: "",
    contact: "",
    residence: "",
    business_name: "",
    type_of_business: "",
    support_status: "",
    start_date: "",
    business_location: "",
    amount_requested: "",
    amount_approved: "",
    amount_status: "",
    current_status: "",
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
        .from('self_empowerment')
        .insert({
          applicant_id: formData.applicant_id || null,
          full_name: formData.full_name,
          gender: formData.gender as "Male" | "Female" | null || null,
          contact: formData.contact || null,
          residence: formData.residence as "Kibera" | "Kawangware" | "Diaspora" | "Outside Nairobi" | null || null,
          business_name: formData.business_name || null,
          type_of_business: formData.type_of_business || null,
          support_status: formData.support_status || null,
          start_date: formData.start_date || null,
          business_location: formData.business_location || null,
          amount_requested: formData.amount_requested ? parseFloat(formData.amount_requested) : null,
          amount_approved: formData.amount_approved ? parseFloat(formData.amount_approved) : null,
          amount_status: formData.amount_status as "Loan" | "Grant" | null || null,
          current_status: formData.current_status || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Self-empowerment application created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating self-empowerment application:', error);
      toast({
        title: "Error",
        description: "Failed to create self-empowerment application",
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
          <Label htmlFor="applicant_id">Applicant ID</Label>
          <Input
            id="applicant_id"
            value={formData.applicant_id}
            onChange={(e) => handleInputChange('applicant_id', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="contact">Contact</Label>
          <Input
            id="contact"
            value={formData.contact}
            onChange={(e) => handleInputChange('contact', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="residence">Residence</Label>
          <Select value={formData.residence} onValueChange={(value) => handleInputChange('residence', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select residence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Kibera">Kibera</SelectItem>
              <SelectItem value="Kawangware">Kawangware</SelectItem>
              <SelectItem value="Diaspora">Diaspora</SelectItem>
              <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="business_name">Business Name</Label>
          <Input
            id="business_name"
            value={formData.business_name}
            onChange={(e) => handleInputChange('business_name', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="type_of_business">Type of Business</Label>
          <Input
            id="type_of_business"
            value={formData.type_of_business}
            onChange={(e) => handleInputChange('type_of_business', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="business_location">Business Location</Label>
          <Input
            id="business_location"
            value={formData.business_location}
            onChange={(e) => handleInputChange('business_location', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="amount_requested">Amount Requested</Label>
          <Input
            id="amount_requested"
            type="number"
            step="0.01"
            value={formData.amount_requested}
            onChange={(e) => handleInputChange('amount_requested', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="amount_approved">Amount Approved</Label>
          <Input
            id="amount_approved"
            type="number"
            step="0.01"
            value={formData.amount_approved}
            onChange={(e) => handleInputChange('amount_approved', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="amount_status">Amount Status</Label>
          <Select value={formData.amount_status} onValueChange={(value) => handleInputChange('amount_status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Loan">Loan</SelectItem>
              <SelectItem value="Grant">Grant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="support_status">Support Status</Label>
          <Textarea
            id="support_status"
            value={formData.support_status}
            onChange={(e) => handleInputChange('support_status', e.target.value)}
            placeholder="Describe current support status..."
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="current_status">Current Status</Label>
          <Textarea
            id="current_status"
            value={formData.current_status}
            onChange={(e) => handleInputChange('current_status', e.target.value)}
            placeholder="Describe current business status..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Application"}
        </Button>
      </div>
    </form>
  );
}