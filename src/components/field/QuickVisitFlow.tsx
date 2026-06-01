import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Camera, MapPin, Users, ClipboardCheck, Zap, ArrowRight } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useFieldScopeCache } from '@/hooks/useFieldScopeCache';
import { captureGPS, compressImage } from '@/lib/offlineStorage';
import { VoiceTextarea } from './VoiceTextarea';
import { toast } from 'sonner';

type Step = 'project' | 'beneficiary' | 'observation' | 'photo' | 'gps' | 'attendance' | 'done';

const ORDER: Step[] = ['project', 'beneficiary', 'observation', 'photo', 'gps', 'attendance'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

/**
 * Sub-60s field capture flow: large tap targets, one step per screen,
 * minimal typing, works one-handed and fully offline.
 */
export function QuickVisitFlow({ open, onOpenChange }: Props) {
  const { addRecord } = useOfflineSync();
  const { programs, beneficiaries } = useFieldScopeCache();
  const [step, setStep] = useState<Step>('project');
  const [programId, setProgramId] = useState<string>('');
  const [beneficiaryId, setBeneficiaryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [present, setPresent] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep('project'); setProgramId(''); setBeneficiaryId(''); setSearch('');
    setNotes(''); setPhoto(null); setGps(null); setPresent(null);
    setStartedAt(Date.now()); setElapsed(0);
  }, [open]);

  useEffect(() => {
    if (!open || step === 'done') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [open, step, startedAt]);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
  const advance = () => idx === ORDER.length - 1 ? save() : next();

  const beneficiaryName = beneficiaries.find(b => b.id === beneficiaryId)?.display_name;
  const filtered = beneficiaries.filter(b =>
    !search || b.display_name?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const captureGps = async () => {
    try {
      const c = await captureGPS();
      setGps({ latitude: c.latitude, longitude: c.longitude });
      toast.success('Location captured');
      next();
    } catch { toast.error('Could not capture location'); }
  };

  const save = async () => {
    // Save observation (links to program/beneficiary), with optional photo + attendance
    await addRecord('observation', {
      beneficiary_id: beneficiaryId || null,
      program_id: programId || null,
      observation_date: new Date().toISOString().slice(0, 10),
      observation_category: 'progress',
      narrative_notes: notes,
      status: 'open',
      _visit_type: 'field_visit',
      _location: gps ? `${gps.latitude},${gps.longitude}` : null,
    });
    if (photo) {
      try {
        const compressed = await compressImage(photo);
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(compressed);
        });
        await addRecord('attachment', {
          fileData, fileName: photo.name, bucket: 'beneficiary-photos',
          path: `field/${beneficiaryId || 'visit'}/${Date.now()}_${photo.name}`,
        });
      } catch {}
    }
    if (present !== null && beneficiaryId) {
      await addRecord('attendance', {
        beneficiary_id: beneficiaryId,
        activity_id: null,
        attendance_status: present ? 'present' : 'absent',
        notes: notes || null,
      });
    }
    setStep('done');
    toast.success(`Visit saved in ${elapsed}s`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Quick Visit</span>
            <Badge variant="outline" className={elapsed > 60 ? 'border-yellow-500 text-yellow-600' : 'border-emerald-500 text-emerald-600'}>
              {elapsed}s {elapsed <= 60 ? '· goal' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="px-4 pb-2 flex items-center gap-1">
          {ORDER.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="p-4 pt-2 min-h-[280px]">
          {step === 'project' && (
            <div className="space-y-2">
              <Label className="text-sm">Pick a project</Label>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {programs.length === 0 && <p className="text-xs text-muted-foreground">No programs cached. Working unscoped.</p>}
                {programs.map(p => (
                  <Button key={p.id} variant={programId === p.id ? 'default' : 'outline'}
                    className="w-full justify-start h-12 text-left"
                    onClick={() => { setProgramId(p.id); next(); }}>
                    {p.name}
                  </Button>
                ))}
                <Button variant="ghost" className="w-full h-10" onClick={next}>Skip</Button>
              </div>
            </div>
          )}

          {step === 'beneficiary' && (
            <div className="space-y-2">
              <Label className="text-sm">Select beneficiary</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-11" />
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {filtered.map(b => (
                  <Button key={b.id} variant={beneficiaryId === b.id ? 'default' : 'outline'}
                    className="w-full justify-start h-11"
                    onClick={() => { setBeneficiaryId(b.id); next(); }}>
                    <Users className="h-4 w-4 mr-2" />{b.display_name}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" className="w-full" onClick={next}>Skip</Button>
            </div>
          )}

          {step === 'observation' && (
            <div className="space-y-2">
              <Label className="text-sm">What did you observe?</Label>
              <VoiceTextarea value={notes} onValueChange={setNotes} rows={5} placeholder="Tap mic to dictate, or type a brief note…" />
              <Button className="w-full h-12" onClick={next} disabled={!notes.trim()}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 'photo' && (
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2"><Camera className="h-4 w-4" /> Photo (optional)</Label>
              <Input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="h-11" />
              {photo && <p className="text-xs text-muted-foreground">{photo.name}</p>}
              <Button className="w-full h-12" onClick={next}>{photo ? 'Use photo' : 'Skip'} <ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          )}

          {step === 'gps' && (
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> GPS</Label>
              {gps && <p className="text-xs text-muted-foreground">{gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}</p>}
              <Button className="w-full h-12" onClick={captureGps}>Capture location</Button>
              <Button variant="ghost" className="w-full" onClick={next}>Skip</Button>
            </div>
          )}

          {step === 'attendance' && (
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Attendance</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={present === true ? 'default' : 'outline'} className="h-14" onClick={() => setPresent(true)}>Present</Button>
                <Button variant={present === false ? 'default' : 'outline'} className="h-14" onClick={() => setPresent(false)}>Absent</Button>
              </div>
              <Button className="w-full h-12" onClick={save}>Save visit</Button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-3 py-8">
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
              <p className="font-semibold">Visit saved {beneficiaryName ? `for ${beneficiaryName}` : ''}</p>
              <p className="text-xs text-muted-foreground">Captured in {elapsed}s · queued for sync</p>
              <Button className="w-full h-12" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}