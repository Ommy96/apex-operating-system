import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FamilyAdoptionFormProps {
  family?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FamilyAdoptionForm({ family, onSuccess, onCancel }: FamilyAdoptionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    known_name: family?.known_name || "",
    actual_name: family?.actual_name || "",
    gender: family?.gender || "",
    residence: family?.residence || "",
    category: family?.category || "",
    no_of_beneficiaries: family?.no_of_beneficiaries?.toString() || "",
    sponsor: family?.sponsor || "",
    family_status: family?.family_status || "",
    source_of_income: family?.source_of_income || "",
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
      const familyData = {
        known_name: formData.known_name,
        actual_name: formData.actual_name || null,
        gender: formData.gender as "Male" | "Female" | null || null,
        residence: formData.residence as "Kibera" | "Kawangware" | "Diaspora" | "Outside Nairobi" | null || null,
        category: formData.category as "Guardian Ration" | "Home Based Care" | null || null,
        no_of_beneficiaries: formData.no_of_beneficiaries ? parseInt(formData.no_of_beneficiaries) : null,
        sponsor: formData.sponsor as "NSP-AID" | "Donation" | null || null,
        family_status: formData.family_status || null,
        source_of_income: formData.source_of_income || null,
      };

      if (family) {
        const { error } = await supabase
          .from('family_adoption')
          .update(familyData)
          .eq('id', family.id);
          
        if (error) throw error;

        toast({
          title: "Success",
          description: "Family adoption record updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('family_adoption')
          .insert(familyData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Family adoption record created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating family adoption:', error);
      toast({
        title: "Error",
        description: "Failed to create family adoption record",
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
          <Label htmlFor="known_name">Known Name *</Label>
          <Input
            id="known_name"
            value={formData.known_name}
            onChange={(e) => handleInputChange('known_name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="actual_name">Actual Name</Label>
          <Input
            id="actual_name"
            value={formData.actual_name}
            onChange={(e) => handleInputChange('actual_name', e.target.value)}
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
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Guardian Ration">Guardian Ration</SelectItem>
              <SelectItem value="Home Based Care">Home Based Care</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="no_of_beneficiaries">Number of Beneficiaries</Label>
          <Input
            id="no_of_beneficiaries"
            type="number"
            value={formData.no_of_beneficiaries}
            onChange={(e) => handleInputChange('no_of_beneficiaries', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="sponsor">Sponsor</Label>
          <Select value={formData.sponsor} onValueChange={(value) => handleInputChange('sponsor', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select sponsor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NSP-AID">NSP-AID</SelectItem>
              <SelectItem value="Donation">Donation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="family_status">Family Status</Label>
          <Select value={formData.family_status} onValueChange={(value) => handleInputChange('family_status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select family status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Single Parent Home">Single Parent Home</SelectItem>
              <SelectItem value="No Parent">No Parent</SelectItem>
              <SelectItem value="Dual Parent Home">Dual Parent Home</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="source_of_income">Source of Income</Label>
          <Input
            id="source_of_income"
            value={formData.source_of_income}
            onChange={(e) => handleInputChange('source_of_income', e.target.value)}
            placeholder="e.g., Small business, Employment, etc."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (family ? "Updating..." : "Creating...") : (family ? "Update Record" : "Create Record")}
        </Button>
      </div>
    </form>
  );
}