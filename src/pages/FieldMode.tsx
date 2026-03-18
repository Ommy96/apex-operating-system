import { useState, useCallback } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { captureGPS, compressImage } from "@/lib/offlineStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Wifi, WifiOff, RefreshCw, Users, ClipboardList, MapPin,
  Camera, Upload, CheckCircle, AlertCircle, Clock, Trash2,
  Smartphone, Signal, Database, ArrowLeft, Plus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function FieldMode() {
  const navigate = useNavigate();
  const { isOnline, isSyncing, stats, addRecord, syncAll, retryFailed, cleanSynced, records } = useOfflineSync();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [beneficiaryFormOpen, setBeneficiaryFormOpen] = useState(false);
  const [observationFormOpen, setObservationFormOpen] = useState(false);

  // Fetch programs for selectors (cached for offline)
  const { data: programs } = useQuery({
    queryKey: ['field-programs', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('id, name')
        .eq('organization_id', orgId!).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const { data: beneficiaries } = useQuery({
    queryKey: ['field-beneficiaries', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('beneficiaries').select('id, display_name')
        .eq('organization_id', orgId!).eq('status', 'active').order('display_name').limit(500);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 60,
  });

  // ── Beneficiary Registration Form ──
  const [benForm, setBenForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: 'male' as string,
    location: '', institution_name: '', grade: '', phone: '',
  });
  const [benPhoto, setBenPhoto] = useState<File | null>(null);
  const [benGPS, setBenGPS] = useState<{ latitude: number; longitude: number } | null>(null);
  const [capturingGPS, setCapturingGPS] = useState(false);

  const handleCaptureGPS = async (setter: (v: any) => void) => {
    setCapturingGPS(true);
    try {
      const coords = await captureGPS();
      setter({ latitude: coords.latitude, longitude: coords.longitude });
      toast.success(`Location captured: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    } catch {
      toast.error("Could not capture location. Ensure GPS is enabled.");
    } finally {
      setCapturingGPS(false);
    }
  };

  const handleSaveBeneficiary = async () => {
    let photoData = null;
    if (benPhoto) {
      try {
        const compressed = await compressImage(benPhoto);
        const reader = new FileReader();
        photoData = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(compressed);
        });
      } catch { /* skip photo if compression fails */ }
    }

    await addRecord('beneficiary', {
      first_name: benForm.first_name,
      last_name: benForm.last_name,
      display_name: `${benForm.first_name} ${benForm.last_name}`.trim(),
      date_of_birth: benForm.date_of_birth || null,
      gender: benForm.gender,
      location: benForm.location || null,
      institution_name: benForm.institution_name || null,
      grade: benForm.grade || null,
      beneficiary_type: 'student',
      status: 'active',
      gps: benGPS,
      _offline_photo: photoData,
    });

    toast.success("Beneficiary saved offline");
    setBeneficiaryFormOpen(false);
    setBenForm({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', location: '', institution_name: '', grade: '', phone: '' });
    setBenPhoto(null);
    setBenGPS(null);
  };

  // ── Observation Form ──
  const [obsForm, setObsForm] = useState({
    beneficiary_id: '', program_id: '', observation_category: 'progress' as string,
    visit_type: 'home_visit' as string, visit_date: new Date().toISOString().split('T')[0],
    observation_findings: '', challenges_identified: '', recommendations: '', reason_for_visit: '',
  });
  const [obsGPS, setObsGPS] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleSaveObservation = async () => {
    // Save as program_observation (syncs to program_observations table)
    await addRecord('observation', {
      beneficiary_id: obsForm.beneficiary_id || null,
      program_id: obsForm.program_id || null,
      observation_date: obsForm.visit_date,
      observation_category: obsForm.observation_category || 'progress',
      narrative_notes: obsForm.observation_findings || '',
      recommended_action: obsForm.recommendations || null,
      status: 'open',
      // Extra fields for visitation record
      _visit_type: obsForm.visit_type,
      _reason_for_visit: obsForm.reason_for_visit || null,
      _challenges_identified: obsForm.challenges_identified || null,
      _location: obsGPS ? `${obsGPS.latitude}, ${obsGPS.longitude}` : null,
    });

    toast.success("Observation saved offline");
    setObservationFormOpen(false);
    setObsForm({ beneficiary_id: '', program_id: '', observation_category: 'progress', visit_type: 'home_visit', visit_date: new Date().toISOString().split('T')[0], observation_findings: '', challenges_identified: '', recommendations: '', reason_for_visit: '' });
    setObsGPS(null);
  };

  const pendingRecords = records.filter(r => r.status === 'pending');
  const failedRecords = records.filter(r => r.status === 'failed');
  const syncedRecords = records.filter(r => r.status === 'synced');

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Field Mode
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${isOnline ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-destructive text-destructive'}`}>
              {isOnline ? <><Wifi className="h-3 w-3 mr-1" /> Online</> : <><WifiOff className="h-3 w-3 mr-1" /> Offline</>}
            </Badge>
            {stats.pending > 0 && (
              <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-xs">
                {stats.pending} pending
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-auto gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="text-xs py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="collect" className="text-xs py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Collect
            </TabsTrigger>
            <TabsTrigger value="sync" className="text-xs py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Sync
            </TabsTrigger>
          </TabsList>

          {/* ════════ DASHBOARD TAB ════════ */}
          <TabsContent value="dashboard" className="mt-4 space-y-4">
            {/* Connection Status */}
            <Card className={isOnline ? 'border-emerald-500/30' : 'border-destructive/30'}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isOnline ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                  {isOnline ? <Signal className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="h-6 w-6 text-destructive" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{isOnline ? 'Connected' : 'Offline Mode'}</p>
                  <p className="text-xs text-muted-foreground">
                    {isOnline ? 'Data will sync automatically' : 'Data is saved locally on this device'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Sync</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.synced}</p>
                <p className="text-xs text-muted-foreground">Synced</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Database className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </CardContent></Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-20 flex-col gap-2 rounded-xl text-sm"
                onClick={() => { setBeneficiaryFormOpen(true); setActiveTab('collect'); }}
              >
                <Users className="h-6 w-6" />
                Register Beneficiary
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-20 flex-col gap-2 rounded-xl text-sm"
                onClick={() => { setObservationFormOpen(true); setActiveTab('collect'); }}
              >
                <ClipboardList className="h-6 w-6" />
                Record Observation
              </Button>
            </div>
          </TabsContent>

          {/* ════════ COLLECT TAB ════════ */}
          <TabsContent value="collect" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button size="lg" className="h-16 justify-start gap-4 rounded-xl" onClick={() => setBeneficiaryFormOpen(true)}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20"><Users className="h-5 w-5" /></div>
                <div className="text-left">
                  <p className="font-semibold">Register Beneficiary</p>
                  <p className="text-xs opacity-80">Add new beneficiary with photo and GPS</p>
                </div>
              </Button>

              <Button size="lg" variant="outline" className="h-16 justify-start gap-4 rounded-xl" onClick={() => setObservationFormOpen(true)}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><ClipboardList className="h-5 w-5 text-primary" /></div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Record Observation</p>
                  <p className="text-xs text-muted-foreground">Field visit, home visit, or school visit</p>
                </div>
              </Button>
            </div>

            {/* Recent offline records */}
            {pendingRecords.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Captures</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {pendingRecords.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        {r.type === 'beneficiary' ? <Users className="h-4 w-4 text-primary" /> : <ClipboardList className="h-4 w-4 text-primary" />}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {r.type === 'beneficiary' ? r.data.display_name : `Observation - ${r.data.visit_type}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), 'dd MMM HH:mm')}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-yellow-600 dark:text-yellow-400 border-yellow-500/30">Pending</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ════════ SYNC TAB ════════ */}
          <TabsContent value="sync" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Sync Status</p>
                  <Badge variant="outline" className={isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                {stats.total > 0 && (
                  <Progress value={stats.total > 0 ? (stats.synced / stats.total) * 100 : 0} className="h-2" />
                )}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="font-bold text-foreground">{stats.pending}</p><p className="text-muted-foreground">Pending</p></div>
                  <div><p className="font-bold text-foreground">{stats.synced}</p><p className="text-muted-foreground">Synced</p></div>
                  <div><p className="font-bold text-foreground">{stats.failed}</p><p className="text-muted-foreground">Failed</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={syncAll} disabled={isSyncing || !isOnline || stats.pending === 0} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button variant="outline" onClick={retryFailed} disabled={stats.failed === 0 || !isOnline} className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Retry Failed ({stats.failed})
              </Button>
            </div>

            {stats.synced > 0 && (
              <Button variant="ghost" onClick={cleanSynced} className="w-full text-muted-foreground gap-2">
                <Trash2 className="h-4 w-4" />
                Clear Synced Records
              </Button>
            )}

            {/* Record List */}
            {records.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">All Records</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.type === 'beneficiary' ? <Users className="h-4 w-4 text-primary shrink-0" /> : <ClipboardList className="h-4 w-4 text-primary shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {r.type === 'beneficiary' ? r.data.display_name : `Observation`}
                          </p>
                          <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), 'dd MMM yyyy HH:mm')}</p>
                          {r.errorMessage && <p className="text-xs text-destructive truncate">{r.errorMessage}</p>}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        r.status === 'synced' ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                        r.status === 'failed' ? 'text-destructive border-destructive/30' :
                        r.status === 'syncing' ? 'text-blue-600 dark:text-blue-400 border-blue-500/30' :
                        'text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
                      }`}>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ════════ BENEFICIARY FORM DIALOG ════════ */}
      <Dialog open={beneficiaryFormOpen} onOpenChange={setBeneficiaryFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Register Beneficiary</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={benForm.first_name} onChange={e => setBenForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" /></div>
              <div><Label>Last Name *</Label><Input value={benForm.last_name} onChange={e => setBenForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date of Birth</Label><Input type="date" value={benForm.date_of_birth} onChange={e => setBenForm(p => ({ ...p, date_of_birth: e.target.value }))} /></div>
              <div><Label>Gender</Label>
                <Select value={benForm.gender} onValueChange={v => setBenForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Location</Label><Input value={benForm.location} onChange={e => setBenForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Nairobi, Kibera" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>School/Institution</Label><Input value={benForm.institution_name} onChange={e => setBenForm(p => ({ ...p, institution_name: e.target.value }))} /></div>
              <div><Label>Grade/Class</Label><Input value={benForm.grade} onChange={e => setBenForm(p => ({ ...p, grade: e.target.value }))} /></div>
            </div>

            {/* Photo */}
            <div>
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Photo</Label>
              <Input type="file" accept="image/*" capture="environment" onChange={e => setBenPhoto(e.target.files?.[0] || null)} className="mt-1" />
              {benPhoto && <p className="text-xs text-muted-foreground mt-1">{benPhoto.name} ({(benPhoto.size / 1024).toFixed(0)} KB)</p>}
            </div>

            {/* GPS */}
            <div>
              <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> GPS Location</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => handleCaptureGPS(setBenGPS)} disabled={capturingGPS} className="mt-1 gap-2">
                <MapPin className="h-4 w-4" />
                {capturingGPS ? 'Capturing...' : benGPS ? `${benGPS.latitude.toFixed(4)}, ${benGPS.longitude.toFixed(4)}` : 'Capture Location'}
              </Button>
            </div>

            <Button onClick={handleSaveBeneficiary} disabled={!benForm.first_name || !benForm.last_name} className="w-full h-12 text-base">
              Save Beneficiary
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════ OBSERVATION FORM DIALOG ════════ */}
      <Dialog open={observationFormOpen} onOpenChange={setObservationFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Record Observation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Program</Label>
              <Select value={obsForm.program_id} onValueChange={v => setObsForm(p => ({ ...p, program_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select program (optional)" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Beneficiary</Label>
              <Select value={obsForm.beneficiary_id} onValueChange={v => setObsForm(p => ({ ...p, beneficiary_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select beneficiary (optional)" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {beneficiaries?.map(b => <SelectItem key={b.id} value={b.id}>{b.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={obsForm.observation_category} onValueChange={v => setObsForm(p => ({ ...p, observation_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="concern">Concern</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Visit Type</Label>
                <Select value={obsForm.visit_type} onValueChange={v => setObsForm(p => ({ ...p, visit_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home_visit">Home Visit</SelectItem>
                    <SelectItem value="school_visit">School Visit</SelectItem>
                    <SelectItem value="field_visit">Field Visit</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Date</Label><Input type="date" value={obsForm.visit_date} onChange={e => setObsForm(p => ({ ...p, visit_date: e.target.value }))} /></div>
            <div><Label>Reason for Visit</Label><Input value={obsForm.reason_for_visit} onChange={e => setObsForm(p => ({ ...p, reason_for_visit: e.target.value }))} placeholder="Why the visit was conducted" /></div>
            <div><Label>Findings / Observations *</Label><Textarea value={obsForm.observation_findings} onChange={e => setObsForm(p => ({ ...p, observation_findings: e.target.value }))} placeholder="What did you observe?" rows={3} /></div>
            <div><Label>Challenges Identified</Label><Textarea value={obsForm.challenges_identified} onChange={e => setObsForm(p => ({ ...p, challenges_identified: e.target.value }))} placeholder="Any challenges?" rows={2} /></div>
            <div><Label>Recommendations</Label><Textarea value={obsForm.recommendations} onChange={e => setObsForm(p => ({ ...p, recommendations: e.target.value }))} placeholder="Suggested actions" rows={2} /></div>

            {/* GPS */}
            <div>
              <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> GPS Location</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => handleCaptureGPS(setObsGPS)} disabled={capturingGPS} className="mt-1 gap-2">
                <MapPin className="h-4 w-4" />
                {capturingGPS ? 'Capturing...' : obsGPS ? `${obsGPS.latitude.toFixed(4)}, ${obsGPS.longitude.toFixed(4)}` : 'Capture Location'}
              </Button>
            </div>

            <Button onClick={handleSaveObservation} disabled={!obsForm.beneficiary_id} className="w-full h-12 text-base">
              Save Observation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
