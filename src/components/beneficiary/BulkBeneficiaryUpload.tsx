import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ParsedRow {
  display_name: string;
  first_name: string;
  last_name: string;
  beneficiary_type: 'student' | 'adult' | 'group';
  gender: string | null;
  date_of_birth: string | null;
  location: string | null;
  county: string | null;
  institution_name: string | null;
  academic_level: string | null;
  grade: string | null;
  status: string;
  error?: string;
}

const TEMPLATE_COLUMNS = [
  'First Name', 'Last Name', 'Type (student/adult/group)', 'Gender (Male/Female)',
  'Date of Birth (YYYY-MM-DD)', 'Location', 'County', 'Institution Name',
  'Academic Level', 'Grade', 'Status (active/inactive)'
];

export function BulkBeneficiaryUpload({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, [
      'Jane', 'Doe', 'student', 'Female', '2010-05-15', 'Nairobi', 'Nairobi', 'St. Mary School', 'Primary', 'Grade 5', 'active'
    ]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Beneficiaries');
    XLSX.writeFile(wb, 'beneficiary-upload-template.xlsx');
  };

  const normalizeType = (val: string): 'student' | 'adult' | 'group' => {
    const v = (val || '').toLowerCase().trim();
    if (v === 'adult') return 'adult';
    if (v === 'group') return 'group';
    return 'student';
  };

  const normalizeGender = (val: string): string | null => {
    const v = (val || '').toLowerCase().trim();
    if (v === 'male' || v === 'm') return 'Male';
    if (v === 'female' || v === 'f') return 'Female';
    return null;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        const parsed: ParsedRow[] = data.map((row) => {
          const firstName = String(row['First Name'] || '').trim();
          const lastName = String(row['Last Name'] || '').trim();
          const displayName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
          const type = normalizeType(String(row['Type (student/adult/group)'] || 'student'));

          const parsed: ParsedRow = {
            display_name: displayName,
            first_name: firstName,
            last_name: lastName,
            beneficiary_type: type,
            gender: normalizeGender(String(row['Gender (Male/Female)'] || '')),
            date_of_birth: String(row['Date of Birth (YYYY-MM-DD)'] || '').trim() || null,
            location: String(row['Location'] || '').trim() || null,
            county: String(row['County'] || '').trim() || null,
            institution_name: String(row['Institution Name'] || '').trim() || null,
            academic_level: String(row['Academic Level'] || '').trim() || null,
            grade: String(row['Grade'] || '').trim() || null,
            status: String(row['Status (active/inactive)'] || 'active').toLowerCase().trim() === 'inactive' ? 'inactive' : 'active',
          };

          if (!parsed.display_name) parsed.error = 'Name is required';
          return parsed;
        });

        setRows(parsed);
      } catch {
        toast({ title: 'Error', description: 'Failed to parse file. Please use the provided template.', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!currentOrganization?.organization_id || !user) return;
    const validRows = rows.filter(r => !r.error);
    if (validRows.length === 0) {
      toast({ title: 'No valid rows', description: 'All rows have errors', variant: 'destructive' });
      return;
    }

    setImporting(true);
    const errors: string[] = [];
    let created = 0;
    const batchSize = 50;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map(r => ({
        organization_id: currentOrganization.organization_id,
        display_name: r.display_name,
        first_name: r.first_name || null,
        last_name: r.last_name || null,
        beneficiary_type: r.beneficiary_type as any,
        gender: r.gender as any,
        date_of_birth: r.date_of_birth,
        location: r.location,
        county: r.county,
        institution_name: r.institution_name,
        academic_level: r.academic_level as any,
        grade: r.grade,
        status: r.status,
        created_by: user.id,
        country: 'Kenya',
      }));

      const { data, error } = await supabase
        .from('beneficiaries')
        .insert(batch)
        .select('id');

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        created += data?.length || 0;
      }
    }

    setResult({ created, errors });
    setImporting(false);

    if (created > 0) {
      toast({ title: 'Import Complete', description: `${created} beneficiaries imported successfully` });
      onSuccess();
    }
    if (errors.length > 0) {
      toast({ title: 'Some errors occurred', description: errors[0], variant: 'destructive' });
    }
  };

  const validCount = rows.filter(r => !r.error).length;
  const errorCount = rows.filter(r => r.error).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRows([]); setResult(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Bulk Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Beneficiary Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Download template & upload */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg bg-muted/50 border">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Step 1: Download the template and fill in beneficiary data</p>
              <p className="text-xs text-muted-foreground">Use the Excel template to ensure correct column format</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg bg-muted/50 border">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Step 2: Upload your filled Excel file</p>
              <p className="text-xs text-muted-foreground">Supports .xlsx and .xls formats</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
              <Upload className="h-4 w-4" />
              Choose File
            </Button>
          </div>

          {/* Preview */}
          {rows.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    {validCount} valid
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errorCount} errors
                    </Badge>
                  )}
                </div>
                <Button onClick={handleImport} disabled={importing || validCount === 0} className="gap-1.5">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import {validCount} Beneficiaries
                </Button>
              </div>

              <ScrollArea className="h-[340px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx} className={row.error ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.display_name || <span className="text-destructive italic">Missing</span>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{row.beneficiary_type}</Badge></TableCell>
                        <TableCell className="text-sm">{row.gender || '—'}</TableCell>
                        <TableCell className="text-sm">{row.location || '—'}</TableCell>
                        <TableCell className="text-sm">{row.institution_name || '—'}</TableCell>
                        <TableCell>
                          {row.error ? (
                            <Badge variant="destructive" className="text-xs">{row.error}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">{row.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">{result.created} beneficiaries imported successfully</span>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => { setRows([]); setResult(null); }}>
                Upload Another
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
