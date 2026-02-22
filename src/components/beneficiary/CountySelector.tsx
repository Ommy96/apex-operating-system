import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { COUNTY_NAMES, getSubCounties } from '@/lib/kenyaCounties';
import { COUNTRIES } from '@/lib/countries';

interface CountySelectorProps {
  countryField: string;
  countyField: string;
  subCountyField: string;
  homeCountyField?: string;
  estateVillageField?: string;
}

export function CountySelector({ countryField, countyField, subCountyField, homeCountyField, estateVillageField }: CountySelectorProps) {
  const form = useFormContext();
  const selectedCountry = form.watch(countryField);
  const selectedCounty = form.watch(countyField);
  const isKenya = selectedCountry === 'Kenya';
  const subCounties = isKenya && selectedCounty ? getSubCounties(selectedCounty) : [];

  // Clear county/sub-county when country changes
  useEffect(() => {
    const currentCounty = form.getValues(countyField);
    const currentSubCounty = form.getValues(subCountyField);
    if (selectedCountry && currentCounty && isKenya && !COUNTY_NAMES.includes(currentCounty)) {
      form.setValue(countyField, '');
      form.setValue(subCountyField, '');
    }
    if (!isKenya && currentSubCounty) {
      // Keep free text values for non-Kenya countries
    }
  }, [selectedCountry]);

  // Clear sub-county when county changes for Kenya
  useEffect(() => {
    if (isKenya) {
      const currentSubCounty = form.getValues(subCountyField);
      if (selectedCounty && currentSubCounty && !subCounties.includes(currentSubCounty)) {
        form.setValue(subCountyField, '');
      }
    }
  }, [selectedCounty]);

  return (
    <>
      <FormField
        control={form.control}
        name={countryField}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-[300px]">
                {COUNTRIES.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isKenya ? (
          <>
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
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name={countyField}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region / State / Province</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter region or state" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={subCountyField}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District / City</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter district or city" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
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
          isKenya ? (
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
          ) : (
            <FormField
              control={form.control}
              name={homeCountyField}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Region (Origin)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter home region" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )
        )}
      </div>
    </>
  );
}
