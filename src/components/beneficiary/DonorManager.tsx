import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, DollarSign, ChevronsUpDown, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';

interface Donor {
  donor_name: string;
  amount_received: number | null;
  donation_date: string;
  notes: string;
  program_id: string | null;
}

interface Program {
  id: string;
  name: string;
}

interface DonorManagerProps {
  donors: Donor[];
  onChange: (donors: Donor[]) => void;
}

export function DonorManager({ donors, onChange }: DonorManagerProps) {
  const { currentOrganization } = useOrganization();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [existingDonors, setExistingDonors] = useState<string[]>([]);
  const [openPopover, setOpenPopover] = useState<number | null>(null);

  useEffect(() => {
    if (!currentOrganization?.organization_id) return;
    // Fetch programs and existing donor names in parallel
    supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', currentOrganization.organization_id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setPrograms(data);
      });

    supabase
      .from('beneficiary_donors')
      .select('donor_name')
      .eq('organization_id', currentOrganization.organization_id)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(d => d.donor_name).filter(Boolean))].sort();
          setExistingDonors(unique);
        }
      });
  }, [currentOrganization?.organization_id]);

  const addDonor = () => {
    onChange([
      ...donors,
      {
        donor_name: '',
        amount_received: null,
        donation_date: new Date().toISOString().split('T')[0],
        notes: '',
        program_id: null,
      },
    ]);
  };

  const removeDonor = (index: number) => {
    onChange(donors.filter((_, i) => i !== index));
  };

  const updateDonor = (index: number, field: keyof Donor, value: any) => {
    onChange(
      donors.map((donor, i) =>
        i === index ? { ...donor, [field]: value } : donor
      )
    );
  };

  return (
    <div className="space-y-4">
      {donors.length === 0 ? (
        <div className="text-center py-6 border rounded-lg border-dashed">
          <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No donors added yet</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={addDonor}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Donor
          </Button>
        </div>
      ) : (
        <>
          {donors.map((donor, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium">Donor {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDonor(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Donor Name *</label>
                    <Popover open={openPopover === index} onOpenChange={(open) => setOpenPopover(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPopover === index}
                          className="w-full justify-between mt-1 font-normal"
                        >
                          {donor.donor_name || "Select or type donor name"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search or type new donor..."
                            onValueChange={(search) => {
                              // Allow free-text: update donor name as user types
                              updateDonor(index, 'donor_name', search);
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {donor.donor_name ? (
                                <button
                                  className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                                  onClick={() => setOpenPopover(null)}
                                >
                                  Use "<span className="font-medium">{donor.donor_name}</span>"
                                </button>
                              ) : (
                                "Type a donor name"
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {existingDonors.map((name) => (
                                <CommandItem
                                  key={name}
                                  value={name}
                                  onSelect={(val) => {
                                    updateDonor(index, 'donor_name', val);
                                    setOpenPopover(null);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", donor.donor_name === name ? "opacity-100" : "opacity-0")} />
                                  {name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Program Sponsored</label>
                    <Select
                      value={donor.program_id || ''}
                      onValueChange={(value) =>
                        updateDonor(index, 'program_id', value || null)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Amount (KSH)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={donor.amount_received || ''}
                      onChange={(e) =>
                        updateDonor(
                          index,
                          'amount_received',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Donation Date</label>
                    <Input
                      type="date"
                      value={donor.donation_date}
                      onChange={(e) =>
                        updateDonor(index, 'donation_date', e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      placeholder="Additional notes"
                      value={donor.notes}
                      onChange={(e) =>
                        updateDonor(index, 'notes', e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDonor}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Donor
          </Button>
        </>
      )}
    </div>
  );
}
