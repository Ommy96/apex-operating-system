import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Calendar, Briefcase, Phone, Mail, Link, Award } from "lucide-react";

interface AlumniFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AlumniForm({ initialData, onSuccess, onCancel }: AlumniFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: initialData?.full_name || "",
    location: initialData?.location || "",
    graduation_year: initialData?.graduation_year || new Date().getFullYear(),
    exit_year: initialData?.exit_year || new Date().getFullYear(),
    current_status: initialData?.current_status || "",
    short_bio: initialData?.short_bio || "",
    detailed_story: initialData?.detailed_story || "",
    contact_email: initialData?.contact_email || "",
    contact_phone: initialData?.contact_phone || "",
    social_link: initialData?.social_link || "",
    profile_photo_url: initialData?.profile_photo_url || "",
    gender: initialData?.gender || "",
    achievements: initialData?.achievements || "",
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        graduation_year: parseInt(formData.graduation_year.toString()),
        exit_year: parseInt(formData.exit_year.toString()),
        created_by: user?.id,
      };

      let query;
      if (initialData?.id) {
        // Update existing alumni
        query = supabase
          .from('alumni')
          .update(dataToSubmit)
          .eq('id', initialData.id);
      } else {
        // Insert new alumni
        query = supabase
          .from('alumni')
          .insert([dataToSubmit]);
      }

      const { error } = await query;
      if (error) throw error;

      toast({
        title: "Success",
        description: `Alumni ${initialData?.id ? 'updated' : 'added'} successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving alumni:', error);
      toast({
        title: "Error",
        description: "Failed to save alumni. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Current location"
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
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="profile_photo_url">Profile Photo URL</Label>
              <Input
                id="profile_photo_url"
                value={formData.profile_photo_url}
                onChange={(e) => handleInputChange('profile_photo_url', e.target.value)}
                placeholder="https://example.com/photo.jpg"
                type="url"
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic & Professional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Academic & Professional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="graduation_year">Graduation Year</Label>
                <Select 
                  value={formData.graduation_year.toString()} 
                  onValueChange={(value) => handleInputChange('graduation_year', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="exit_year">Exit Year</Label>
                <Select 
                  value={formData.exit_year.toString()} 
                  onValueChange={(value) => handleInputChange('exit_year', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="current_status" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Current Status *
              </Label>
              <Select 
                value={formData.current_status} 
                onValueChange={(value) => handleInputChange('current_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select current status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Working">Working</SelectItem>
                  <SelectItem value="Studying">Studying</SelectItem>
                  <SelectItem value="Entrepreneurship">Entrepreneurship</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="achievements" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Achievements
              </Label>
              <Textarea
                id="achievements"
                value={formData.achievements}
                onChange={(e) => handleInputChange('achievements', e.target.value)}
                placeholder="Notable achievements, awards, recognitions..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="contact_email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              placeholder="alumni@example.com"
            />
          </div>

          <div>
            <Label htmlFor="contact_phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone}
              onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              placeholder="+254 700 000 000"
            />
          </div>

          <div>
            <Label htmlFor="social_link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Social Link
            </Label>
            <Input
              id="social_link"
              type="url"
              value={formData.social_link}
              onChange={(e) => handleInputChange('social_link', e.target.value)}
              placeholder="LinkedIn, Facebook, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Biography */}
      <Card>
        <CardHeader>
          <CardTitle>Biography & Story</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="short_bio">Short Bio *</Label>
            <Textarea
              id="short_bio"
              value={formData.short_bio}
              onChange={(e) => handleInputChange('short_bio', e.target.value)}
              placeholder="Brief description of current role/status (e.g., 'Software Developer at Tech Kenya')"
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="detailed_story">Detailed Story</Label>
            <Textarea
              id="detailed_story"
              value={formData.detailed_story}
              onChange={(e) => handleInputChange('detailed_story', e.target.value)}
              placeholder="Share their journey, achievements, and current endeavors..."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData?.id ? "Update Alumni" : "Add Alumni"}
        </Button>
      </div>
    </form>
  );
}