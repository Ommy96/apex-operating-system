import { logger } from "@/lib/logger";
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ensureWritten } from '@/lib/settingsWrite';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Download, FileText, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';

function getExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const daysUntil = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return { status: 'expired', label: `Expired ${Math.abs(daysUntil)} days ago`, variant: 'destructive' as const };
  if (daysUntil <= 60) return { status: 'warning', label: `Expires in ${daysUntil} days`, variant: 'secondary' as const };
  return { status: 'ok', label: `Valid until ${expiry.toLocaleDateString()}`, variant: 'outline' as const };
}

export function ComplianceDocumentsSettings() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  // Read the saved values from the organisation row itself. (Previously these were
  // seeded from `currentOrganization`, which only carries id/name/slug/role — so the
  // form always reopened blank and looked like the save had reverted.)
  const { data: org, error: loadError } = useQuery({
    queryKey: ['organization-compliance', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('kra_exemption_expiry, ngo_board_cert_expiry, pbo_number, pbo_expiry, kra_exemption_cert_url, ngo_board_cert_url')
        .eq('id', orgId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });

  const [kraExpiry, setKraExpiry] = useState('');
  const [ngoExpiry, setNgoExpiry] = useState('');
  const [pboNumber, setPboNumber] = useState('');
  const [pboExpiry, setPboExpiry] = useState('');
  useEffect(() => {
    if (!org) return;
    setKraExpiry(org.kra_exemption_expiry || '');
    setNgoExpiry(org.ngo_board_cert_expiry || '');
    setPboNumber(org.pbo_number || '');
    setPboExpiry(org.pbo_expiry || '');
  }, [org]);
  useEffect(() => {
    if (loadError) toast.error(`Could not load compliance details: ${(loadError as any).message}`);
  }, [loadError]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (docType: 'kra' | 'ngo') => {
    if (!orgId) return;
    setDownloading(docType);
    try {
      const path = docType === 'kra' 
        ? `${orgId}/kra-exemption.pdf`
        : `${orgId}/ngo-board-cert.pdf`;
      const { data, error } = await supabase.storage
        .from('compliance-docs')
        .createSignedUrl(path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      logger.error('Download error:', err);
      toast.error('Failed to generate download link');
    } finally {
      setDownloading(null);
    }
  };

  const handleFileUpload = async (file: File, docType: 'kra' | 'ngo') => {
    if (!orgId) return;
    setUploading(docType);
    try {
      const path = docType === 'kra' 
        ? `${orgId}/kra-exemption.pdf`
        : `${orgId}/ngo-board-cert.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('compliance-docs')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the path reference (not public URL) - downloads use signed URLs
      const updateField = docType === 'kra' 
        ? { kra_exemption_cert_url: path }
        : { ngo_board_cert_url: path };

      ensureWritten(
        await supabase
          .from('organizations')
          .update(updateField)
          .eq('id', orgId)
          .select('id'),
        'The certificate link',
      );
      qc.invalidateQueries({ queryKey: ['organization-compliance', orgId] });
      toast.success(`${docType === 'kra' ? 'KRA Certificate' : 'NGO Board Certificate'} uploaded successfully`);
    } catch (err: any) {
      logger.error('Upload error:', err);
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      ensureWritten(
        await supabase
          .from('organizations')
          .update({
            kra_exemption_expiry: kraExpiry || null,
            ngo_board_cert_expiry: ngoExpiry || null,
            pbo_number: pboNumber || null,
            pbo_expiry: pboExpiry || null,
          })
          .eq('id', orgId)
          .select('id'),
        'Compliance details',
      );
      qc.invalidateQueries({ queryKey: ['organization-compliance', orgId] });
      qc.invalidateQueries({ queryKey: ['organization-details'] });
      toast.success('Compliance details saved successfully');
    } catch (err: any) {
      logger.error('Save error:', err);
      toast.error(err?.message || 'Failed to save compliance details');
    } finally {
      setSaving(false);
    }
  };

  const kraStatus = getExpiryStatus(kraExpiry);
  const ngoStatus = getExpiryStatus(ngoExpiry);
  const pboStatus = getExpiryStatus(pboExpiry);

  return (
    <div className="space-y-6">
      {/* KRA Tax Exemption */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            KRA Tax Exemption Certificate
          </CardTitle>
          <CardDescription>Upload and track your KRA tax exemption status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {org?.kra_exemption_cert_url ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">kra-exemption.pdf</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownload('kra')} disabled={downloading === 'kra'}>
                  {downloading === 'kra' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  {downloading === 'kra' ? 'Generating link...' : 'Download'}
                </Button>
                <label>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'kra')}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">
                      {uploading === 'kra' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                      Replace
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'kra')}
              />
              {uploading === 'kra' ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              )}
              <span className="text-sm text-muted-foreground">Click to upload KRA certificate (PDF)</span>
            </label>
          )}

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <div className="flex items-center gap-3">
              <Input type="date" value={kraExpiry} onChange={(e) => setKraExpiry(e.target.value)} className="max-w-xs" />
              {kraStatus && (
                <Badge variant={kraStatus.variant} className={kraStatus.status === 'expired' ? 'bg-destructive text-destructive-foreground' : kraStatus.status === 'warning' ? 'bg-warning/10 text-warning' : ''}>
                  {kraStatus.status === 'expired' && <ShieldAlert className="h-3 w-3 mr-1" />}
                  {kraStatus.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {kraStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NGO Board Certificate */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            NGO Board Certificate
          </CardTitle>
          <CardDescription>Upload and track your NGO Board registration status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {org?.ngo_board_cert_url ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">ngo-board-cert.pdf</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownload('ngo')} disabled={downloading === 'ngo'}>
                  {downloading === 'ngo' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  {downloading === 'ngo' ? 'Generating link...' : 'Download'}
                </Button>
                <label>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'ngo')}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">
                      {uploading === 'ngo' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                      Replace
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'ngo')}
              />
              {uploading === 'ngo' ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              )}
              <span className="text-sm text-muted-foreground">Click to upload NGO Board certificate (PDF)</span>
            </label>
          )}

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <div className="flex items-center gap-3">
              <Input type="date" value={ngoExpiry} onChange={(e) => setNgoExpiry(e.target.value)} className="max-w-xs" />
              {ngoStatus && (
                <Badge variant={ngoStatus.variant} className={ngoStatus.status === 'expired' ? 'bg-destructive text-destructive-foreground' : ngoStatus.status === 'warning' ? 'bg-warning/10 text-warning' : ''}>
                  {ngoStatus.status === 'expired' && <ShieldAlert className="h-3 w-3 mr-1" />}
                  {ngoStatus.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {ngoStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PBO Registration */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            PBO Registration
          </CardTitle>
          <CardDescription>Public Benefit Organization registration details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>PBO Number</Label>
            <Input value={pboNumber} onChange={(e) => setPboNumber(e.target.value)} placeholder="Enter PBO registration number" className="max-w-xs" />
          </div>
          <div className="space-y-2">
            <Label>PBO Expiry Date</Label>
            <div className="flex items-center gap-3">
              <Input type="date" value={pboExpiry} onChange={(e) => setPboExpiry(e.target.value)} className="max-w-xs" />
              {pboStatus && (
                <Badge variant={pboStatus.variant} className={pboStatus.status === 'expired' ? 'bg-destructive text-destructive-foreground' : pboStatus.status === 'warning' ? 'bg-warning/10 text-warning' : ''}>
                  {pboStatus.status === 'expired' && <ShieldAlert className="h-3 w-3 mr-1" />}
                  {pboStatus.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {pboStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Compliance Details
      </Button>
    </div>
  );
}
