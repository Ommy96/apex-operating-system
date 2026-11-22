import { useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { SectorField } from '@/hooks/useOrgBeneficiaryConfig';
import { coreFieldStep, normaliseCustomField } from '@/lib/beneficiaryCustomFields';

const FIELD_TYPES = ['text', 'number', 'date', 'textarea', 'boolean', 'select'];

export function CustomBeneficiaryFields({ fields, onChange }: {
  fields: SectorField[];
  onChange: (fields: SectorField[]) => void;
}) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [options, setOptions] = useState('');
  const step = coreFieldStep({ name, label });

  const add = () => {
    if (step) {
      toast({ title: 'Duplicate field', description: `This is already captured in the ${step} step`, variant: 'destructive' });
      return;
    }
    const key = normaliseCustomField(name).replace(/ /g, '_');
    const choices = [...new Set(options.split(',').map(value => value.trim()).filter(Boolean))];
    if (!key || !label.trim() || (type === 'select' && !choices.length)) {
      toast({ title: 'Complete the field details', description: 'A name and label are required. Selection fields also need options.', variant: 'destructive' });
      return;
    }
    if (fields.some(field => normaliseCustomField(field.name) === normaliseCustomField(key))) {
      toast({ title: 'Field already exists', variant: 'destructive' });
      return;
    }
    onChange([...fields, { name: key, label: label.trim(), type, ...(type === 'select' ? { options: choices } : {}) }]);
    setName(''); setLabel(''); setOptions('');
  };

  return <section className="space-y-3">
    <h3 className="text-base font-semibold">Custom beneficiary fields</h3>
    {fields.map(field => <div key={field.name} className="flex items-center justify-between gap-3 border-b border-border py-2">
      <div><span className="text-sm font-medium">{field.label}</span><span className="ml-2 text-xs text-muted-foreground">{field.name}</span></div>
      <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${field.label}`} title={`Remove ${field.label}`} onClick={() => onChange(fields.filter(item => item.name !== field.name))}><X className="h-4 w-4" /></Button>
    </div>)}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1"><Label htmlFor="custom-field-name">Field name</Label><Input id="custom-field-name" value={name} onChange={event => setName(event.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="custom-field-label">Label</Label><Input id="custom-field-label" value={label} onChange={event => setLabel(event.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="custom-field-type">Type</Label><Select value={type} onValueChange={setType}><SelectTrigger id="custom-field-type"><SelectValue /></SelectTrigger><SelectContent>{FIELD_TYPES.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {type === 'select' && <div className="space-y-1"><Label htmlFor="custom-field-options">Options (comma-separated)</Label><Input id="custom-field-options" value={options} onChange={event => setOptions(event.target.value)} /></div>}
    {step && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" />This is already captured in the {step} step</p>}
    <Button type="button" variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" />Add field</Button>
  </section>;
}