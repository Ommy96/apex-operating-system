import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';

const kipawaSatoSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  gender: z.enum(['Male', 'Female']).optional(),
  age: z.number().min(1).max(100).optional(),
  academic_level: z.enum(['Pre Primary', 'Lower Primary', 'Upper Primary', 'Junior Secondary School', 'Secondary School', 'Senior School', 'Tertiary', 'Special School']).optional(),
  location: z.enum(['Kibera', 'Kawangware']).optional(),
  talent_category: z.enum(['Music', 'Dance', 'Poetry', 'Art & Craft', 'Sport', 'Boardgames']).optional(),
  specific_skill: z.enum(['Singing', 'Spoken Word', 'Drawing', 'Instruments', 'Football', 'Basketball', 'Chess', 'Fashion', 'Modern', 'Traditional']).optional(),
  year_enrolled: z.number().min(2000).max(new Date().getFullYear()).optional(),
  coach_mentor_name: z.string().optional(),
  awards_recognition: z.string().optional(),
  school_support_given: z.boolean().optional(),
});

type KipawaSatoFormData = z.infer<typeof kipawaSatoSchema>;

interface KipawaSatoFormProps {
  member?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function KipawaSatoForm({ member, onSuccess, onCancel }: KipawaSatoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { currentOrganization } = useOrganization();
  
  const form = useForm<KipawaSatoFormData>({
    resolver: zodResolver(kipawaSatoSchema),
    defaultValues: {
      full_name: member?.full_name || '',
      gender: member?.gender || '',
      age: member?.age || undefined,
      academic_level: member?.academic_level || '',
      location: member?.location || '',
      talent_category: member?.talent_category || '',
      specific_skill: member?.specific_skill || '',
      year_enrolled: member?.year_enrolled || undefined,
      coach_mentor_name: member?.coach_mentor_name || '',
      awards_recognition: member?.awards_recognition || '',
      school_support_given: member?.school_support_given ?? false,
    },
  });

  const onSubmit = async (data: KipawaSatoFormData) => {
    setIsLoading(true);
    
    try {
      if (member) {
        const { error } = await supabase
          .from('kipawa_sato')
          .update(data)
          .eq('id', member.id);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Kipawa Sato member updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('kipawa_sato')
          .insert([{ ...data, created_by: (await supabase.auth.getUser()).data.user?.id, organization_id: currentOrganization?.organization_id }]);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Kipawa Sato member added successfully",
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving Kipawa Sato member:', error);
      toast({
        title: "Error",
        description: "Failed to save Kipawa Sato member",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Enter age" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Kibera">Kibera</SelectItem>
                    <SelectItem value="Kawangware">Kawangware</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  <SelectItem value="Junior Secondary School">Junior Secondary School</SelectItem>
                  <SelectItem value="Secondary School">Secondary School</SelectItem>
                  <SelectItem value="Senior School">Senior School</SelectItem>
                  <SelectItem value="Tertiary">Tertiary</SelectItem>
                  <SelectItem value="Special School">Special School</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="talent_category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Talent Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select talent category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Dance">Dance</SelectItem>
                    <SelectItem value="Poetry">Poetry</SelectItem>
                    <SelectItem value="Art & Craft">Art & Craft</SelectItem>
                    <SelectItem value="Sport">Sport</SelectItem>
                    <SelectItem value="Boardgames">Boardgames</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specific_skill"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specific Skill</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific skill" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Singing">Singing</SelectItem>
                    <SelectItem value="Spoken Word">Spoken Word</SelectItem>
                    <SelectItem value="Drawing">Drawing</SelectItem>
                    <SelectItem value="Instruments">Instruments</SelectItem>
                    <SelectItem value="Football">Football</SelectItem>
                    <SelectItem value="Basketball">Basketball</SelectItem>
                    <SelectItem value="Chess">Chess</SelectItem>
                    <SelectItem value="Fashion">Fashion</SelectItem>
                    <SelectItem value="Modern">Modern</SelectItem>
                    <SelectItem value="Traditional">Traditional</SelectItem>
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
            name="year_enrolled"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year Enrolled</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Enter year enrolled" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coach_mentor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coach/Mentor Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter coach or mentor name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="awards_recognition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Awards/Recognition Received</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter any awards or recognition received" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="school_support_given"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">School Support Given?</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Has this member received school support?
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : member ? 'Update' : 'Add Member'}
          </Button>
        </div>
      </form>
    </Form>
  );
}