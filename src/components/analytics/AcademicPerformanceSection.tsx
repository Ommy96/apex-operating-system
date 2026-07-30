import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { GraduationCap, Download, Loader2, AlertTriangle, School } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_PALETTE } from '@/lib/chartPalette';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgBeneficiaryConfig } from '@/hooks/useOrgBeneficiaryConfig';
import { downloadExcel } from '@/lib/downloadUtils';
import { calculateAge } from '@/lib/ageUtils';
import { toast } from '@/hooks/use-toast';

const LEVEL_ORDER = [
  'Pre Primary',
  'Lower Primary',
  'Upper Primary',
  'Junior Secondary School',
  'Secondary School',
  'Senior School',
  'Special School',
  'Tertiary',
];

type Row = {
  id: string;
  unique_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  county: string | null;
  sub_county: string | null;
  academic_level: string | null;
  grade: string | null;
  institution_name: string | null;
};

function useAcademicData() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ['analytics-academic', orgId],
    queryFn: async () => {
      if (!orgId) return [] as Row[];
      const all: Row[] = [];
      const batch = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('beneficiaries')
          .select(
            'id, unique_id, first_name, last_name, display_name, gender, date_of_birth, county, sub_county, academic_level, grade, institution_name',
          )
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .or('is_active.is.null,is_active.eq.true')
          .range(offset, offset + batch - 1);
        if (error) throw error;
        const rows = (data || []) as Row[];
        all.push(...rows);
        if (rows.length < batch) break;
        offset += batch;
      }
      return all;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export default function AcademicPerformanceSection() {
  const { config } = useOrgBeneficiaryConfig();
  const { data: rows = [], isLoading } = useAcademicData();
  const [exportOpen, setExportOpen] = useState(false);

  if (config && config.collect_education_data === false) return null;

  // Derived metrics
  const stats = useMemo(() => {
    const enrolled = rows.filter((r) => !!r.academic_level).length;
    const notEnrolled = rows.filter((r) => r.academic_level === null && (r.grade === null || r.grade === '')).length;
    const unknown = rows.filter((r) => r.academic_level === null && r.grade === null).length;
    return { enrolled, notEnrolled, unknown, total: rows.length };
  }, [rows]);

  const levelData = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      if (!r.academic_level) return;
      counts[r.academic_level] = (counts[r.academic_level] || 0) + 1;
    });
    const ordered = LEVEL_ORDER.filter((l) => counts[l]).map((l) => ({ name: l, value: counts[l] }));
    Object.keys(counts).filter((l) => !LEVEL_ORDER.includes(l)).forEach((l) =>
      ordered.push({ name: l, value: counts[l] }),
    );
    return ordered;
  }, [rows]);

  const topSchools = useMemo(() => {
    const map: Record<string, { name: string; count: number; ages: number[] }> = {};
    rows.forEach((r) => {
      if (!r.institution_name) return;
      if (!map[r.institution_name]) map[r.institution_name] = { name: r.institution_name, count: 0, ages: [] };
      map[r.institution_name].count += 1;
      const age = calculateAge(r.date_of_birth);
      if (age !== null) map[r.institution_name].ages.push(age);
    });
    return Object.values(map)
      .map((s) => ({
        name: s.name,
        count: s.count,
        avgAge: s.ages.length ? Math.round(s.ages.reduce((a, b) => a + b, 0) / s.ages.length) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rows]);

  const gradeData = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      if (!r.grade) return;
      counts[r.grade] = (counts[r.grade] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [rows]);

  const genderGapData = useMemo(() => {
    const buckets: Record<string, { name: string; Female: number; Male: number; Other: number }> = {};
    rows.forEach((r) => {
      if (!r.academic_level) return;
      const lvl = r.academic_level;
      if (!buckets[lvl]) buckets[lvl] = { name: lvl, Female: 0, Male: 0, Other: 0 };
      const g = (r.gender || '').toLowerCase();
      if (g === 'female') buckets[lvl].Female += 1;
      else if (g === 'male') buckets[lvl].Male += 1;
      else buckets[lvl].Other += 1;
    });
    return LEVEL_ORDER.filter((l) => buckets[l]).map((l) => buckets[l]);
  }, [rows]);

  // Gender gap warning: Female% in Secondary < Female% in Upper Primary by >15pp
  const genderAlert = useMemo(() => {
    const upperPri = genderGapData.find((d) => d.name === 'Upper Primary');
    const sec = genderGapData.find((d) => d.name === 'Secondary School');
    if (!upperPri || !sec) return null;
    const upTotal = upperPri.Female + upperPri.Male;
    const secTotal = sec.Female + sec.Male;
    if (!upTotal || !secTotal) return null;
    const upPct = (upperPri.Female / upTotal) * 100;
    const secPct = (sec.Female / secTotal) * 100;
    if (upPct - secPct > 15) {
      return `Girls' secondary enrollment (${secPct.toFixed(0)}%) is significantly lower than upper primary (${upPct.toFixed(0)}%). Consider targeted retention support.`;
    }
    return null;
  }, [genderGapData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Academic Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Academic Performance Analysis</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
          <Download className="mr-2 h-4 w-4" /> Export Academic Results
        </Button>
      </div>

      {/* Enrollment overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="In a level" value={stats.enrolled} tone="primary" />
        <StatTile label="Total beneficiaries" value={stats.total} tone="muted" />
        <StatTile label="Unknown level" value={stats.unknown} tone="warning" />
        <StatTile
          label="% with level recorded"
          value={stats.total ? `${Math.round((stats.enrolled / stats.total) * 100)}%` : '—'}
          tone="muted"
        />
      </div>

      {/* Level distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Level distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {levelData.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No academic-level data recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={levelData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={150} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {levelData.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Schools + grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <School className="h-4 w-4" /> Top institutions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSchools.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">No institutions recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-2">#</th>
                      <th className="text-left py-2 pr-2">School</th>
                      <th className="text-right py-2 pr-2">Enrolled</th>
                      <th className="text-right py-2">Avg age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSchools.map((s, i) => (
                      <tr key={s.name} className="border-b last:border-0">
                        <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2">{s.name}</td>
                        <td className="py-2 pr-2 text-right font-medium">{s.count}</td>
                        <td className="py-2 text-right">{s.avgAge ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Grade / class distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {gradeData.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">No grade data recorded.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gradeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {gradeData.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gender education gap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Gender gap by academic level</CardTitle>
        </CardHeader>
        <CardContent>
          {genderGapData.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Not enough data to compare.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={genderGapData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Female" fill={CHART_PALETTE[4]} />
                  <Bar dataKey="Male" fill={CHART_PALETTE[1]} />
                  <Bar dataKey="Other" fill={CHART_PALETTE[2]} />
                </BarChart>
              </ResponsiveContainer>
              {genderAlert && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{genderAlert}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} rows={rows} />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: number | string;
  tone?: 'primary' | 'warning' | 'muted';
}) {
  const toneClasses =
    tone === 'primary'
      ? 'border-primary/30 bg-primary/5'
      : tone === 'warning'
        ? 'border-warning/40 bg-warning/10'
        : 'border-border bg-card';
  return (
    <div className={`rounded-lg border ${toneClasses} p-3`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ExportDialog({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  rows: Row[];
}) {
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [includeIndividual, setIncludeIndividual] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const requiresConsent = includeIndividual && format !== 'pdf';

  async function handleExport() {
    if (requiresConsent && !consent) {
      toast({ title: 'Consent required', description: 'Please confirm secure handling.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (format === 'pdf') {
        // Lightweight PDF export via window.print on the analytics container.
        // Avoids pulling jsPDF/html2canvas into this bundle.
        window.print();
      } else if (includeIndividual) {
        const data = rows.map((r) => ({
          unique_id: r.unique_id,
          first_name: r.first_name,
          last_name: r.last_name,
          gender: r.gender,
          date_of_birth: r.date_of_birth,
          county: r.county,
          sub_county: r.sub_county,
          institution_name: r.institution_name,
          academic_level: r.academic_level,
          grade: r.grade,
        }));
        if (format === 'excel') {
          downloadExcel(data, `academic-performance-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Beneficiaries');
        } else {
          // CSV
          const headers = Object.keys(data[0] || { unique_id: '' });
          const csv = [
            headers.join(','),
            ...data.map((row) =>
              headers
                .map((h) => {
                  const v = (row as any)[h];
                  if (v === null || v === undefined) return '';
                  const s = String(v).replace(/"/g, '""');
                  return /[,"\n]/.test(s) ? `"${s}"` : s;
                })
                .join(','),
            ),
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `academic-performance-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // Aggregate-only export
        const agg = Object.values(
          rows.reduce<Record<string, { academic_level: string; count: number }>>((acc, r) => {
            const key = r.academic_level || 'Unknown';
            if (!acc[key]) acc[key] = { academic_level: key, count: 0 };
            acc[key].count += 1;
            return acc;
          }, {}),
        );
        downloadExcel(agg, `academic-summary-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Summary');
      }
      toast({ title: 'Export ready', description: 'Your file has started downloading.' });
      onOpenChange(false);
      setConsent(false);
    } catch (err) {
      toast({ title: 'Export failed', description: String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Academic Results</DialogTitle>
          <DialogDescription>Choose a format and what to include.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)} className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="fmt-xlsx" />
                <Label htmlFor="fmt-xlsx" className="font-normal">Excel spreadsheet (raw data)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <Label htmlFor="fmt-csv" className="font-normal">CSV (raw data)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <Label htmlFor="fmt-pdf" className="font-normal">PDF (printable summary)</Label>
              </div>
            </RadioGroup>
          </div>

          {format !== 'pdf' && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="include-ind"
                checked={includeIndividual}
                onCheckedChange={(c) => setIncludeIndividual(!!c)}
              />
              <Label htmlFor="include-ind" className="font-normal text-sm leading-snug">
                Include individual beneficiary list (name, school, grade, level)
              </Label>
            </div>
          )}

          {requiresConsent && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
              <p className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <span>
                  This export contains individual beneficiary data. Handle securely and in line with the Kenya Data
                  Protection Act 2019. Only share with authorised staff.
                </span>
              </p>
              <div className="mt-3 flex items-start gap-2">
                <Checkbox id="consent" checked={consent} onCheckedChange={(c) => setConsent(!!c)} />
                <Label htmlFor="consent" className="font-normal text-xs leading-snug">
                  I confirm this export will be handled securely.
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={busy || (requiresConsent && !consent)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}