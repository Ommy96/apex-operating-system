import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SectorField } from '@/hooks/useOrgBeneficiaryConfig';

interface Props {
  fields: SectorField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  sectorLabel?: string | null;
}

/**
 * Dynamic step in BeneficiaryForm. Renders whatever custom_fields were
 * seeded by the setup wizard's sector template into
 * org_beneficiary_config.custom_fields. Values are stored in
 * beneficiaries.sector_data (JSONB) keyed by field.name.
 */
export function SectorFieldsStep({ fields, values, onChange, sectorLabel }: Props) {
  if (!fields?.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No sector-specific fields are configured for your organisation. You can
        add them from Settings › Beneficiary data.
      </div>
    );
  }

  // Group by field.group for readability, preserving insertion order.
  const groups = new Map<string, SectorField[]>();
  for (const f of fields) {
    const key = f.group || 'Details';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">
          {sectorLabel ? `${sectorLabel} details` : 'Sector details'}
        </h3>
        <p className="text-xs text-muted-foreground">
          These fields were configured for your sector during setup. All are optional.
        </p>
      </div>
      {Array.from(groups.entries()).map(([group, gFields]) => (
        <div key={group} className="space-y-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {group}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gFields.map((f) => {
              const v = values?.[f.name];
              const id = `sector-${f.name}`;
              const label = (
                <Label htmlFor={id} className="text-sm">
                  {f.label}
                </Label>
              );
              if (f.type === 'textarea' || f.type === 'longtext') {
                return (
                  <div key={f.name} className="sm:col-span-2 space-y-1">
                    {label}
                    <Textarea
                      id={id}
                      value={v ?? ''}
                      onChange={(e) => onChange(f.name, e.target.value)}
                      rows={3}
                    />
                    {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
                  </div>
                );
              }
              if (f.type === 'boolean' || f.type === 'checkbox') {
                return (
                  <div key={f.name} className="flex items-center gap-2 pt-6">
                    <Checkbox
                      id={id}
                      checked={!!v}
                      onCheckedChange={(c) => onChange(f.name, !!c)}
                    />
                    {label}
                  </div>
                );
              }
              if (f.type === 'select' && Array.isArray(f.options) && f.options.length) {
                return (
                  <div key={f.name} className="space-y-1">
                    {label}
                    <Select value={v ?? ''} onValueChange={(x) => onChange(f.name, x)}>
                      <SelectTrigger id={id}>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
                  </div>
                );
              }
              return (
                <div key={f.name} className="space-y-1">
                  {label}
                  <Input
                    id={id}
                    type={
                      f.type === 'number'
                        ? 'number'
                        : f.type === 'date'
                        ? 'date'
                        : 'text'
                    }
                    value={v ?? ''}
                    onChange={(e) =>
                      onChange(
                        f.name,
                        f.type === 'number'
                          ? e.target.value === '' ? '' : Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                  {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}