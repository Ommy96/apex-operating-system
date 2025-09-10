import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

const childSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  photo_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  residence: z.enum(['Kibera', 'Kawangware', 'Diaspora', 'Outside Nairobi']).optional(),
  academic_level: z.enum(['Pre Primary', 'Lower Primary', 'Upper Primary', 'Junior Secondary', 'Secondary School', 'Tertiary', 'Special School', 'Junior School']).optional(),
  institution_name: z.string().optional(),
  grade: z.string().optional(),
  parental_status: z.enum(['Both alive', 'Both deceased', 'Partial']).optional(),
  address: z.string().optional(),
  guardian_name: z.string().optional(),
  relation: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact: z.string().optional(),
  medical_notes: z.string().optional(),
  special_needs: z.string().optional(),
  special_condition: z.string().optional(),
  status: z.string(),
  donor: z.string().optional(),
  donation_received_ksh: z.number().optional(),
});

type ChildFormData = z.infer<typeof childSchema>;

interface ChildFormProps {
  child?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChildForm({ child, onSuccess, onCancel }: ChildFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(child?.photo_url || '');
  
  const form = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      first_name: child?.first_name || '',
      last_name: child?.last_name || '',
      date_of_birth: child?.date_of_birth || '',
      gender: child?.gender || '',
      photo_url: child?.photo_url || '',
      residence: child?.residence || '',
      academic_level: child?.academic_level || '',
      institution_name: child?.institution_name || '',
      grade: child?.grade || '',
      parental_status: child?.parental_status || '',
      address: child?.address || '',
      guardian_name: child?.guardian_name || '',
      relation: child?.relation || '',
      guardian_phone: child?.guardian_phone || '',
      guardian_email: child?.guardian_email || '',
      contact: child?.contact || '',
      medical_notes: child?.medical_notes || '',
      special_needs: child?.special_needs || '',
      special_condition: child?.special_condition || '',
      status: child?.status || 'active',
      donor: child?.donor || '',
      donation_received_ksh: child?.donation_received_ksh || undefined,
    },
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const convertGoogleDriveUrl = (url: string) => {
    if (!url) return url;
    
    // Check if it's a Google Drive sharing link
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    
    return url;
  };

  const onSubmit = async (data: ChildFormData) => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Clean up the data - convert empty strings to null for date fields
      const cleanedData = {
        ...data,
        date_of_birth: data.date_of_birth && data.date_of_birth.trim() !== '' ? data.date_of_birth : null,
        created_by: user?.id
      };
      
      if (child) {
        // Update existing child
        const { error } = await supabase
          .from('children')
          .update(cleanedData)
          .eq('id', child.id);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Child profile updated successfully",
        });
      } else {
        // Create new child
        const { error } = await supabase
          .from('children')
          .insert([cleanedData]);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Child profile created successfully",
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving child:', error);
      toast({
        title: "Error",
        description: "Failed to save child profile. Please ensure you have permission to perform this action.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollArea className="h-[80vh]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="photo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Picture URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter image URL (e.g., https://example.com/photo.jpg)" 
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setPhotoUrl(e.target.value);
                  }}
                />
              </FormControl>
              {photoUrl && (
                <div className="flex items-center gap-3 mt-2">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={convertGoogleDriveUrl(photoUrl)} alt="Profile preview" onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} />
                    <AvatarFallback className="text-sm">
                      {getInitials(form.watch('first_name'), form.watch('last_name'))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">Preview</span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="residence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Residence</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select residence" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Kibera">Kibera</SelectItem>
                    <SelectItem value="Kawangware">Kawangware</SelectItem>
                    <SelectItem value="Diaspora">Diaspora</SelectItem>
                    <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="academic_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Academic Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Pre Primary">Pre Primary</SelectItem>
                    <SelectItem value="Lower Primary">Lower Primary</SelectItem>
                    <SelectItem value="Upper Primary">Upper Primary</SelectItem>
                    <SelectItem value="Junior Secondary">Junior Secondary</SelectItem>
                    <SelectItem value="Secondary School">Secondary School</SelectItem>
                    <SelectItem value="Tertiary">Tertiary</SelectItem>
                    <SelectItem value="Special School">Special School</SelectItem>
                    <SelectItem value="Junior School">Junior School</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="institution_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter institution name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grade</FormLabel>
                <FormControl>
                  <Input placeholder="Enter grade/class" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="parental_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parental Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parental status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Both alive">Both alive</SelectItem>
                  <SelectItem value="Both deceased">Both deceased</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Guardian Information</h3>
          
          <FormField
            control={form.control}
            name="guardian_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter guardian name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="relation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relation</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter relation to child" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact information" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="guardian_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guardian Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="guardian_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guardian Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Additional Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="donor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select donor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NSP-AID">NSP-AID</SelectItem>
                      <SelectItem value="Sebastian">Sebastian</SelectItem>
                      <SelectItem value="Ivar">Ivar</SelectItem>
                      <SelectItem value="Donation">Donation</SelectItem>
                      <SelectItem value="Add donor option">Add donor option</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="donation_received_ksh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donation Received (Ksh)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="Enter amount in Ksh"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="medical_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medical Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter any medical conditions or notes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="special_needs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Needs</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter any special needs or requirements" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="special_condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Condition</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter any special conditions" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : child ? 'Update Child' : 'Add Child'}
          </Button>
        </div>
        </form>
      </Form>
    </ScrollArea>
  );
}