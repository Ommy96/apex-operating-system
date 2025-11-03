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
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Calendar, Briefcase, Phone, Mail, Link, Award } from "lucide-react";

const alumniSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(255),
  location: z.string().trim().max(255).optional().or(z.literal('')),
  graduation_year: z.number().min(1990).max(new Date().getFullYear()),
  exit_year: z.number().min(1990).max(new Date().getFullYear()),
  current_status: z.string().trim().max(255).optional().or(z.literal('')),
  short_bio: z.string().trim().min(10, "Bio must be at least 10 characters").max(500),
  detailed_story: z.string().trim().max(5000).optional().or(z.literal('')),
  contact_email: z.string().email("Invalid email").optional().or(z.literal('')),
  contact_phone: z.string().trim().max(50).optional().or(z.literal('')),
  social_link: z.string().url("Invalid URL").optional().or(z.literal('')),
  profile_photo_url: z.string().url("Invalid URL").optional().or(z.literal('')),
  gender: z.string().optional(),
  achievements: z.string().trim().max(2000).optional().or(z.literal('')),
});

interface AlumniFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AlumniForm({ initialData, onSuccess, onCancel }: AlumniFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof alumniSchema>>({
    resolver: zodResolver(alumniSchema),
    defaultValues: {
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
    },
  });

  const handleSubmit = async (values: z.infer<typeof alumniSchema>) => {
    try {
      const dataToSubmit = {
        ...values,
        created_by: user?.id,
      };

      let query;
      if (initialData?.id) {
        query = supabase
          .from('alumni')
          .update(dataToSubmit)
          .eq('id', initialData.id);
      } else {
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
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter full name" />
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
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Current location" />
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
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profile_photo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Photo URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/photo.jpg" type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <FormField
                  control={form.control}
                  name="graduation_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Graduation Year</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exit_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exit Year</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="current_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Current Status *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select current status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Working">Working</SelectItem>
                        <SelectItem value="Studying">Studying</SelectItem>
                        <SelectItem value="Entrepreneurship">Entrepreneurship</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="achievements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Achievements
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Notable achievements, awards, recognitions..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="alumni@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+254 700 000 000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="social_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Social Link
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="url" placeholder="LinkedIn, Facebook, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Biography */}
        <Card>
          <CardHeader>
            <CardTitle>Biography & Story</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="short_bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Bio *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Brief description of current role/status (e.g., 'Software Developer at Tech Kenya')" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="detailed_story"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Story</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Share their journey, achievements, and current endeavors..." rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : initialData?.id ? "Update Alumni" : "Add Alumni"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
