import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, DollarSign, ChevronsUpDown, Check, UserPlus } from 'lucide-react';
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
  const [searchValues, setSearchValues] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<Record<number, 'select' | 'new'>>({});

  useEffect(() => {
    if (!currentOrganization?.organization_id) return;
    supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', currentOrganization.organization_id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setPrograms(data);
      });

    Promise.all([
      supabase
        .from('donor_accounts')
        .select('donor_name')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('is_active', true),
      supabase
        .from('beneficiary_donors')
        .select('donor_name')
        .eq('organization_id', currentOrganization.organization_id),
    ]).then(([accountsRes, donorsRes]) => {
      const names = new Set<string>();
      accountsRes.data?.forEach(d => { if (d.donor_name) names.add(d.donor_name); });
      donorsRes.data?.forEach(d => { if (d.donor_name) names.add(d.donor_name); });
      setExistingDonors([...names].sort());
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

  const toggleMode = (index: number) => {
    const current = mode[index] || 'select';
    setMode({ ...mode, [index]: current === 'select' ? 'new' : 'select' });
    updateDonor(index, 'donor_name', '');
  };

  return (
    <div className="space-y-3">
      {donors.length === 0 ? (
        <div className="text-center py-6 border rounded-lg border-dashed">
          <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No donors added yet</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={addDonor}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Donor
          </Button>
        </div>
      ) : (
        <>
          {donors.map((donor, index) => {
            const isNewMode = mode[index] === 'new';
            return (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium">Donor {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeDonor(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {/* Donor Name - with toggle between select existing / add new */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground">Donor Name *</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2 text-primary"
                          onClick={() => toggleMode(index)}
                        >
                          {isNewMode ? (
                            <>Select existing</>
                          ) : (
                            <><UserPlus className="h-3 w-3 mr-1" />Add new</>
                          )}
                        </Button>
                      </div>

                      {isNewMode ? (
                        <Input
                          placeholder="Type new donor name..."
                          value={donor.donor_name}
                          onChange={(e) => updateDonor(index, 'donor_name', e.target.value)}
                        />
                      ) : (
                        <Popover open={openPopover === index} onOpenChange={(open) => setOpenPopover(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openPopover === index}
                              className="w-full justify-between font-normal h-9 text-sm"
                            >
                              <span className="truncate">{donor.donor_name || "Select donor..."}</span>
                              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search donors..."
                                value={searchValues[index] || ''}
                                onValueChange={(v) => setSearchValues({ ...searchValues, [index]: v })}
                              />
                              <CommandList>
                                <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                                  No donors found.
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
                                      <Check className={cn("mr-2 h-3.5 w-3.5", donor.donor_name === name ? "opacity-100" : "opacity-0")} />
                                      {name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* Program & Amount row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Program Sponsored</label>
                        <Select
                          value={donor.program_id || ''}
                          onValueChange={(value) => updateDonor(index, 'program_id', value || null)}
                        >
                          <SelectTrigger className="mt-1 h-9 text-sm">
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
                        <label className="text-xs font-medium text-muted-foreground">Amount (KSH)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={donor.amount_received || ''}
                          onChange={(e) =>
                            updateDonor(index, 'amount_received', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          className="mt-1 h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Date & Notes row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Donation Date</label>
                        <Input
                          type="date"
                          value={donor.donation_date}
                          onChange={(e) => updateDonor(index, 'donation_date', e.target.value)}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Notes</label>
                        <Input
                          placeholder="Additional notes"
                          value={donor.notes}
                          onChange={(e) => updateDonor(index, 'notes', e.target.value)}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDonor}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Another Donor
          </Button>
        </>
      )}
    </div>
  );
}
