import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

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
                    <Input
                      placeholder="Enter donor name"
                      value={donor.donor_name}
                      onChange={(e) =>
                        updateDonor(index, 'donor_name', e.target.value)
                      }
                      className="mt-1"
                    />
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
