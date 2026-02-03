import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function MedicalInfoSection() {
  const form = useFormContext();
  const hivStatus = form.watch('hiv_status');
  const hasSpecialNeeds = form.watch('has_special_needs');

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This information is confidential and will only be visible to authorized staff members.
        </AlertDescription>
      </Alert>

      {/* HIV Status Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          HIV Status
        </h4>

        <FormField
          control={form.control}
          name="hiv_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HIV Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="not_disclosed">Not Disclosed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {hivStatus === 'positive' && (
          <FormField
            control={form.control}
            name="hiv_positive_since"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year of Diagnosis</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 2020"
                    min={1980}
                    max={new Date().getFullYear()}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>
                  The year the beneficiary was diagnosed
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Special Needs Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Special Needs
        </h4>

        <FormField
          control={form.control}
          name="has_special_needs"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Has Special Needs</FormLabel>
                <FormDescription>
                  Check if the beneficiary has any special needs or disabilities
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {hasSpecialNeeds && (
          <FormField
            control={form.control}
            name="special_needs_details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Needs Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the special needs, required accommodations, etc."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Other Medical Conditions */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Other Medical Information
        </h4>

        <FormField
          control={form.control}
          name="other_medical_conditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other Medical Conditions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any other medical conditions, allergies, medications, etc."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Include information about chronic conditions, allergies, and regular medications
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
