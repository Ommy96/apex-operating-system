import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, MapPin, AlertCircle } from 'lucide-react';
import { VoiceTextarea } from './VoiceTextarea';
import { SignaturePad } from './SignaturePad';
import { captureGPS, compressImage } from '@/lib/offlineStorage';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { toast } from 'sonner';

export interface SmartFormField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: string; // text, number, decimal, date, select, multiselect, boolean, photo, gps, signature, longtext
  field_options?: { values?: string[]; rows?: number } | null;
  is_required?: boolean;
  helper_text?: string | null;
  depends_on_field_id?: string | null;
  depends_on_value?: string | null;
}

interface Props {
  formId: string;
  fields: SmartFormField[];
  programId?: string;
  projectId?: string;
  beneficiaryIds?: string[];
  onSaved?: () => void;
}

/**
 * Renders a form built in the M&E form builder, with:
 *  • conditional visibility (depends_on_field_id / depends_on_value)
 *  • required-field validation
 *  • photo / GPS / signature / long-text-with-voice support
 *  • fully offline submission via useOfflineSync (queued to me_form_submissions)
 */
export function SmartFormRenderer({ formId, fields, programId, projectId, beneficiaryIds, onSaved }: Props) {
  const { addRecord } = useOfflineSync();
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldsById = useMemo(() => Object.fromEntries(fields.map(f => [f.id, f])), [fields]);

  const isVisible = (f: SmartFormField) => {
    if (!f.depends_on_field_id) return true;
    const parent = fieldsById[f.depends_on_field_id];
    if (!parent) return true;
    const v = values[parent.field_key];
    if (f.depends_on_value == null) return !!v;
    return String(v ?? '').toLowerCase() === String(f.depends_on_value).toLowerCase();
  };

  const setVal = (key: string, v: any) => {
    setValues((p) => ({ ...p, [key]: v }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      if (!isVisible(f)) continue;
      if (f.is_required) {
        const v = values[f.field_key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          next[f.field_key] = 'Required';
        }
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error('Fix required fields');
      return;
    }
    setSubmitting(true);
    try {
      await addRecord('form_submission', {
        form_id: formId,
        program_id: programId,
        project_id: projectId,
        beneficiary_ids: beneficiaryIds,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        submission_date: new Date().toISOString().slice(0, 10),
        data: values,
      });
      toast.success('Form saved (queued for sync)');
      setValues({});
      onSaved?.();
    } finally {
      setSubmitting(false);
    }
  };

  const captureGps = async () => {
    try {
      const c = await captureGPS();
      setGps({ latitude: c.latitude, longitude: c.longitude });
      toast.success('Location captured');
    } catch { toast.error('GPS unavailable'); }
  };

  return (
    <div className="space-y-4">
      {fields.filter(isVisible).map((f) => {
        const err = errors[f.field_key];
        const v = values[f.field_key];
        return (
          <div key={f.id} className="space-y-1.5">
            <Label className="flex items-center gap-1">
              {f.field_label} {f.is_required && <span className="text-destructive">*</span>}
            </Label>
            {f.helper_text && <p className="text-xs text-muted-foreground">{f.helper_text}</p>}

            {f.field_type === 'longtext' || f.field_type === 'textarea' ? (
              <VoiceTextarea value={v || ''} onValueChange={(x) => setVal(f.field_key, x)} rows={f.field_options?.rows || 4} />
            ) : f.field_type === 'number' || f.field_type === 'decimal' ? (
              <Input type="number" value={v ?? ''} onChange={(e) => setVal(f.field_key, e.target.value)} />
            ) : f.field_type === 'date' ? (
              <Input type="date" value={v ?? ''} onChange={(e) => setVal(f.field_key, e.target.value)} />
            ) : f.field_type === 'boolean' ? (
              <div className="flex items-center gap-2">
                <Checkbox checked={!!v} onCheckedChange={(c) => setVal(f.field_key, !!c)} />
                <span className="text-sm">Yes</span>
              </div>
            ) : f.field_type === 'select' ? (
              <Select value={v ?? ''} onValueChange={(x) => setVal(f.field_key, x)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(f.field_options?.values || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : f.field_type === 'photo' ? (
              <div className="space-y-1">
                <Input type="file" accept="image/*" capture="environment" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const blob = await compressImage(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setVal(f.field_key, reader.result);
                    reader.readAsDataURL(blob);
                  } catch { setVal(f.field_key, null); }
                }} />
                {typeof v === 'string' && v.startsWith('data:image') && (
                  <img src={v} alt="evidence" className="h-24 w-24 rounded-md object-cover border" />
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="h-3 w-3" /> Stored offline, synced later</p>
              </div>
            ) : f.field_type === 'gps' || f.field_type === 'location' ? (
              <div className="space-y-1">
                <Button type="button" variant="outline" onClick={async () => { await captureGps(); setVal(f.field_key, gps); }} className="gap-2 h-11">
                  <MapPin className="h-4 w-4" />
                  {v ? `${v.latitude?.toFixed?.(4)}, ${v.longitude?.toFixed?.(4)}` : 'Capture GPS'}
                </Button>
              </div>
            ) : f.field_type === 'signature' ? (
              <SignaturePad value={v || null} onChange={(d) => setVal(f.field_key, d)} />
            ) : (
              <Input value={v ?? ''} onChange={(e) => setVal(f.field_key, e.target.value)} />
            )}
            {err && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{err}</p>}
          </div>
        );
      })}

      <Button onClick={submit} disabled={submitting} className="w-full h-12">
        {submitting ? 'Saving…' : 'Save Submission'}
      </Button>
    </div>
  );
}