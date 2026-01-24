import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const replacementSchema = z.object({
  original_child_id: z.string().min(1, "Please select an original child"),
  new_child_full_name: z.string().min(1, "New child full name is required"),
  new_child_gender: z.enum(["Male", "Female"]).optional(),
  new_child_location: z.enum([
    "Kibera", "Kawangware", "Diaspora", "Outside Nairobi"
  ]).optional(),
  new_child_school: z.string().optional(),
  new_child_grade: z.string().optional(),
  new_child_academic_level: z.enum([
    "Pre Primary", "Lower Primary", "Upper Primary", "Junior Secondary School", "Secondary School", "Senior School", "Tertiary", "Special School"
  ]).optional(),
  replacement_date: z.string().min(1, "Replacement date is required"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type ReplacementFormData = z.infer<typeof replacementSchema>;

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  replacement_status: string;
}

interface Replacement {
  id: string;
  original_child_id: string;
  new_child_full_name: string;
  new_child_gender: string;
  new_child_location: string;
  new_child_school: string;
  new_child_grade: string;
  new_child_academic_level: string;
  replacement_date: string;
  reason: string;
  notes: string;
}

interface ReplacementFormProps {
  replacement?: Replacement | null;
  preselectedChildId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReplacementForm({ replacement, preselectedChildId, onSuccess, onCancel }: ReplacementFormProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [originalChildOpen, setOriginalChildOpen] = useState(false);
  const [originalChildSearch, setOriginalChildSearch] = useState("");

  const form = useForm<ReplacementFormData>({
    resolver: zodResolver(replacementSchema),
    defaultValues: {
      original_child_id: replacement?.original_child_id || preselectedChildId || "",
      new_child_full_name: replacement?.new_child_full_name || "",
      new_child_gender: replacement?.new_child_gender as any || undefined,
      new_child_location: replacement?.new_child_location as any || undefined,
      new_child_school: replacement?.new_child_school || "",
      new_child_grade: replacement?.new_child_grade || "",
      new_child_academic_level: replacement?.new_child_academic_level as any || undefined,
      replacement_date: replacement?.replacement_date || new Date().toISOString().split('T')[0],
      reason: replacement?.reason || "",
      notes: replacement?.notes || "",
    },
  });

  // If preselectedChildId is provided, hide the child selector
  const isChildPreselected = !!preselectedChildId && !replacement;

  // Fetch active children for selection (filtered by organization)
  const { data: children = [] } = useQuery({
    queryKey: ["children-for-replacement", currentOrganization?.organization_id, preselectedChildId],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      // If preselected, fetch that specific child
      if (preselectedChildId) {
        const { data, error } = await supabase
          .from("children")
          .select("id, first_name, last_name, status, replacement_status")
          .eq("id", preselectedChildId)
          .single();
        
        if (error) throw error;
        return data ? [data as Child] : [];
      }
      
      const { data, error } = await supabase
        .from("children")
        .select("id, first_name, last_name, status, replacement_status")
        .eq("organization_id", currentOrganization.organization_id)
        .eq("status", "active")
        .eq("replacement_status", "active")
        .order("first_name");

      if (error) throw error;
      return data as Child[];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Create/Update replacement mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ReplacementFormData) => {
      if (!currentOrganization?.organization_id) {
        throw new Error('No organization selected');
      }
      
      const replacementData = {
        ...data,
        created_by: user?.id,
      };

      if (replacement) {
        // Update existing replacement
        const { error } = await supabase
          .from("replacements")
          .update(replacementData)
          .eq("id", replacement.id);
        
        if (error) throw error;
      } else {
        // Create new replacement with organization_id
        const { error } = await supabase
          .from("replacements")
          .insert([{ ...replacementData, organization_id: currentOrganization.organization_id }]);
        
        if (error) throw error;

        // Update original child status to 'replaced'
        const { error: updateError } = await supabase
          .from("children")
          .update({ replacement_status: "replaced" })
          .eq("id", data.original_child_id);
        
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replacements"] });
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["children-for-replacement"] });
      toast.success(replacement ? "Replacement updated successfully" : "Replacement created successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error("Failed to save replacement");
      console.error("Save error:", error);
    },
  });

  const onSubmit = (data: ReplacementFormData) => {
    saveMutation.mutate(data);
  };

  // Filter children based on search
  const filteredChildren = children.filter(child =>
    `${child.first_name} ${child.last_name}`.toLowerCase().includes(originalChildSearch.toLowerCase())
  );

  const selectedChild = children.find(child => child.id === form.watch("original_child_id"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Original Child Selection - Hidden if preselected */}
        {isChildPreselected ? (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Child to be replaced:</p>
            <p className="font-semibold">{selectedChild?.first_name} {selectedChild?.last_name}</p>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="original_child_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Original Child (to be replaced)</FormLabel>
                <Popover open={originalChildOpen} onOpenChange={setOriginalChildOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedChild
                          ? `${selectedChild.first_name} ${selectedChild.last_name}`
                          : "Select original child..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search children..." 
                        value={originalChildSearch}
                        onValueChange={setOriginalChildSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No children found.</CommandEmpty>
                        <CommandGroup>
                          {filteredChildren.map((child) => (
                            <CommandItem
                              key={child.id}
                              value={`${child.first_name} ${child.last_name}`}
                              onSelect={() => {
                                form.setValue("original_child_id", child.id);
                                setOriginalChildOpen(false);
                              }}
                            >
                              {child.first_name} {child.last_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* New Child Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="new_child_full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Child Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_child_gender"
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
            name="new_child_location"
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
            name="replacement_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Replacement Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="new_child_school"
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

          <FormField
            control={form.control}
            name="new_child_grade"
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
          name="new_child_academic_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic Level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Replacement</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter reason for replacement (optional)"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter any additional notes (optional)"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {replacement ? "Update Replacement" : "Create Replacement"}
          </Button>
        </div>
      </form>
    </Form>
  );
}