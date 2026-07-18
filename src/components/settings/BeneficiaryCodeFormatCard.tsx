import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function preview(prefix: string, format: string, seq: number, orgName: string): string {
  const cleanPrefix =
    (prefix || '').replace(/[^A-Z0-9]/gi, '').toUpperCase() ||
    (orgName || 'ORG').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() ||
    'ORG';
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const yyyy = String(now.getFullYear());
  const nextSeq = String((seq || 0) + 1).padStart(3, '0');
  return (format || '{prefix}-{yy}-{seq}')
    .replace(/\{prefix\}/g, cleanPrefix)
    .replace(/\{yy\}/g, yy)
    .replace(/\{yyyy\}/g, yyyy)
    .replace(/\{seq\}/g, nextSeq);
}

export function BeneficiaryCodeFormatCard() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const orgName = currentOrganization?.organization_name || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [format, setFormat] = useState('{prefix}-{yy}-{seq}');
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    supabase
      .from('organizations')
      .select('beneficiary_code_prefix, beneficiary_code_format, beneficiary_code_seq')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast({ title: 'Could not load format', description: error.message, variant: 'destructive' });
        } else if (data) {
          setPrefix((data as any).beneficiary_code_prefix || '');
          setFormat((data as any).beneficiary_code_format || '{prefix}-{yy}-{seq}');
          setSeq((data as any).beneficiary_code_seq || 0);
        }
        setLoading(false);
      });
  }, [orgId]);

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        beneficiary_code_prefix: prefix.trim() || null,
        beneficiary_code_format: format.trim() || '{prefix}-{yy}-{seq}',
      } as any)
      .eq('id', orgId);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Beneficiary ID format saved' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beneficiary ID format</CardTitle>
        <CardDescription>
          Choose the human-readable code the app assigns to new beneficiaries. The raw database ID is never shown to users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Prefix</Label>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. STU, HTH, BEN"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to auto-derive from your organisation name.</p>
              </div>
              <div>
                <Label>Format template</Label>
                <Input
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  placeholder="{prefix}-{yy}-{seq}"
                />
                <p className="text-xs text-muted-foreground mt-1">Tokens: {'{prefix}'}, {'{yy}'}, {'{yyyy}'}, {'{seq}'}</p>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Next ID will look like: </span>
              <span className="font-mono font-semibold">{preview(prefix, format, seq, orgName)}</span>
              <span className="ml-2 text-xs text-muted-foreground">(current sequence: {seq})</span>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save format
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}