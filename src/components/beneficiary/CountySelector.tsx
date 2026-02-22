import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { COUNTY_NAMES, getSubCounties } from '@/lib/kenyaCounties';

interface CountySelectorProps {
  countyField: string;
  subCountyField: string;
  homeCountyField?: string;
  estateVillageField?: string;
}

export function CountySelector({ countyField, subCountyField, homeCountyField, estateVillageField }: CountySelectorProps) {
  const form = useFormContext();
  const selectedCounty = form.watch(countyField);
  const subCounties = selectedCounty ? getSubCounties(selectedCounty) : [];

  // Clear sub-county when county changes and the current sub-county isn't valid
  useEffect(() => {
    const currentSubCounty = form.getValues(subCountyField);
    if (selectedCounty && currentSubCounty && !subCounties.includes(currentSubCounty)) {
      form.setValue(subCountyField, '');
    }
  }, [selectedCounty]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={countyField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>County</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select county" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {COUNTY_NAMES.map(county => (
                    <SelectItem key={county} value={county}>{county}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={subCountyField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub-County</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ''}
                disabled={!selectedCounty}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCounty ? "Select sub-county" : "Select county first"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {subCounties.map(sc => (
                    <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {estateVillageField && (
          <FormField
            control={form.control}
            name={estateVillageField}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estate/Village</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Kibera" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {homeCountyField && (
          <FormField
            control={form.control}
            name={homeCountyField}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home County (Origin)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select home county" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {COUNTY_NAMES.map(county => (
                      <SelectItem key={county} value={county}>{county}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </>
  );
}
