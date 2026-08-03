import { useState } from "react";
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
  WifiOff, RefreshCw, Users, ClipboardList, MapPin,
  Camera, CheckCircle, AlertCircle, Clock, Trash2,
  Smartphone, Signal, Database, ArrowLeft, Zap, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { SyncStatusIndicator } from "@/components/field/SyncStatusIndicator";
import { QuickVisitFlow } from "@/components/field/QuickVisitFlow";
import { VoiceTextarea } from "@/components/field/VoiceTextarea";
import { useFieldScopeCache } from "@/hooks/useFieldScopeCache";
import { QuickFieldLog } from "@/components/field/QuickFieldLog";

export default function FieldMode() {
  const navigate = useNavigate();
  const { isOnline, isSyncing, stats, addRecord, syncAll, retryFailed, cleanSynced, records, conflicts, resolveConflict } = useOfflineSync();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [beneficiaryFormOpen, setBeneficiaryFormOpen] = useState(false);
  const [observationFormOpen, setObservationFormOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  // IndexedDB-backed scope cache: usable offline for a full day
  const { programs, beneficiaries } = useFieldScopeCache();

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
            <SyncStatusIndicator
              isOnline={isOnline}
              isSyncing={isSyncing}
              pending={stats.pending}
              failed={stats.failed}
              conflicts={conflicts?.filter(c => c.resolution === 'pending').length || 0}
              onClick={() => setActiveTab('sync')}
            />
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
            <Card className={isOnline ? 'border-success/30' : 'border-destructive/30'}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isOnline ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  {isOnline ? <Signal className="h-6 w-6 text-success" /> : <WifiOff className="h-6 w-6 text-destructive" />}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card><CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Sync</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
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
            <Button
              size="lg"
              className="w-full h-16 gap-3 rounded-xl text-base bg-gradient-to-r from-primary to-primary/80"
              onClick={() => setQuickOpen(true)}
            >
              <Zap className="h-5 w-5" /> Quick Visit (under 60s)
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <QuickFieldLog />
            <div className="grid grid-cols-1 gap-3">
              <Button size="lg" className="h-16 justify-start gap-4 rounded-xl bg-gradient-to-r from-primary to-primary/80" onClick={() => setQuickOpen(true)}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20"><Zap className="h-5 w-5" /></div>
                <div className="text-left">
                  <p className="font-semibold">Quick Visit</p>
                  <p className="text-xs opacity-80">Project → beneficiary → note → photo → GPS</p>
                </div>
              </Button>
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
                      <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Pending</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ════════ SYNC TAB ════════ */}
          <TabsContent value="sync" className="mt-4 space-y-4">
            {conflicts && conflicts.filter(c => c.resolution === 'pending').length > 0 && (
              <Card className="border-destructive/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <ShieldAlert className="h-4 w-4" /> Conflicts ({conflicts.filter(c => c.resolution === 'pending').length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {conflicts.filter(c => c.resolution === 'pending').map(c => (
                    <div key={c.id} className="rounded-lg border p-2 text-xs space-y-1">
                      <p className="font-medium text-foreground">{c.type} · {format(new Date(c.detectedAt), 'dd MMM HH:mm')}</p>
                      {c.notes && <p className="text-muted-foreground truncate">{c.notes}</p>}
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => resolveConflict(c.id, 'server_wins')}>Keep server</Button>
                        <Button size="sm" className="h-7" onClick={() => resolveConflict(c.id, 'local_wins')}>Keep local (default)</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Sync Status</p>
                  <Badge variant="outline" className={isOnline ? 'text-success' : 'text-destructive'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                {stats.total > 0 && (
                  <Progress value={stats.total > 0 ? (stats.synced / stats.total) * 100 : 0} className="h-2" />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="font-bold text-foreground">{stats.pending}</p><p className="text-muted-foreground">Pending</p></div>
                  <div><p className="font-bold text-foreground">{stats.synced}</p><p className="text-muted-foreground">Synced</p></div>
                  <div><p className="font-bold text-foreground">{stats.failed}</p><p className="text-muted-foreground">Failed</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        r.status === 'synced' ? 'text-success border-success/30' :
                        r.status === 'failed' ? 'text-destructive border-destructive/30' :
                        r.status === 'syncing' ? 'text-info border-info/30' :
                        'text-warning border-warning/30'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={benForm.first_name} onChange={e => setBenForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" /></div>
              <div><Label>Last Name *</Label><Input value={benForm.last_name} onChange={e => setBenForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div><Label>Challenges Identified</Label>
              <VoiceTextarea value={obsForm.challenges_identified} onValueChange={v => setObsForm(p => ({ ...p, challenges_identified: v }))} placeholder="Any challenges? Tap mic to dictate." rows={2} />
            </div>
            <div><Label>Recommendations</Label>
              <VoiceTextarea value={obsForm.recommendations} onValueChange={v => setObsForm(p => ({ ...p, recommendations: v }))} placeholder="Suggested actions" rows={2} />
            </div>

            {/* GPS */}
            <div>
              <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> GPS Location</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => handleCaptureGPS(setObsGPS)} disabled={capturingGPS} className="mt-1 gap-2">
                <MapPin className="h-4 w-4" />
                {capturingGPS ? 'Capturing...' : obsGPS ? `${obsGPS.latitude.toFixed(4)}, ${obsGPS.longitude.toFixed(4)}` : 'Capture Location'}
              </Button>
            </div>

            <Button onClick={handleSaveObservation} disabled={!obsForm.observation_findings.trim()} className="w-full h-12 text-base">
              Save Observation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuickVisitFlow open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  );
}
