import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

const feedingProgramSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['Male', 'Female']).optional(),
  type: z.enum(['Kawangware Lunch Hour', 'Kibera Early Dinner']).optional(),
  academic_level: z.enum(['Pre Primary', 'Lower Primary', 'Upper Primary', 'Junior Secondary School', 'Secondary School', 'Senior School', 'Tertiary', 'Special School']).optional(),
  grade: z.string().optional(),
  contact: z.string().optional(),
  school: z.string().optional(),
  education_sponsorship: z.boolean().optional(),
});

type FeedingProgramFormData = z.infer<typeof feedingProgramSchema>;

interface FeedingProgramFormProps {
  program?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FeedingProgramForm({ program, onSuccess, onCancel }: FeedingProgramFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<FeedingProgramFormData>({
    resolver: zodResolver(feedingProgramSchema),
    defaultValues: {
      name: program?.name || '',
      gender: program?.gender || '',
      type: program?.type || '',
      academic_level: program?.academic_level || '',
      grade: program?.grade || '',
      contact: program?.contact || '',
      school: program?.school || '',
      education_sponsorship: program?.education_sponsorship ?? false,
    },
  });

  const onSubmit = async (data: FeedingProgramFormData) => {
    setIsLoading(true);
    
    try {
      if (program) {
        const { error } = await supabase
          .from('feeding_program')
          .update(data)
          .eq('id', program.id);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Feeding program record updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('feeding_program')
          .insert([{ ...data, created_by: (await supabase.auth.getUser()).data.user?.id }]);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Feeding program record created successfully",
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving feeding program:', error);
      toast({
        title: "Error",
        description: "Failed to save feeding program record",
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter beneficiary name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select program type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Kawangware Lunch Hour">Kawangware Lunch Hour</SelectItem>
                    <SelectItem value="Kibera Early Dinner">Kibera Early Dinner</SelectItem>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School</FormLabel>
                <FormControl>
                  <Input placeholder="Enter school name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="education_sponsorship"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Education Sponsorship</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Does this beneficiary receive education sponsorship?
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
            {isLoading ? 'Saving...' : program ? 'Update' : 'Add Beneficiary'}
          </Button>
        </div>
      </form>
    </Form>
  );
}