import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Search, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useAlumni } from '@/hooks/useBeneficiaryLifecycle';
import { alumniOutcomeLabel, ALUMNI_OUTCOMES } from '@/lib/lifecycle';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Alumni() {
  useDocumentTitle('Alumni');
  const { data: alumni, isLoading } = useAlumni();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = alumni || [];
    if (!term) return list;
    return list.filter(a =>
      `${a.display_name ?? ''} ${a.first_name ?? ''} ${a.last_name ?? ''} ${a.beneficiary_code ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [alumni, search]);

  const outcomeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of alumni || []) counts[a.alumni_outcome || 'other'] = (counts[a.alumni_outcome || 'other'] || 0) + 1;
    return counts;
  }, [alumni]);

  const totalSupport = (alumni || []).reduce((s, a) => s + a.totalSupport, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Alumni
          </h1>
          <p className="text-sm text-muted-foreground">
            People who completed the programme. They keep their full history and are counted separately from active.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search alumni…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Alumni" value={String((alumni || []).length)} />
        <Stat label="Total support received" value={`KES ${totalSupport.toLocaleString()}`} />
        <Stat label="Joined tertiary" value={String(outcomeCounts['joined_tertiary'] || 0)} />
        <Stat label="Employed / in business" value={String((outcomeCounts['employed'] || 0) + (outcomeCounts['started_business'] || 0))} />
      </div>

      <div className="flex flex-wrap gap-2">
        {ALUMNI_OUTCOMES.map(o => (
          <Badge key={o.value} variant="outline" className="text-xs">
            {o.label}: {outcomeCounts[o.value] || 0}
          </Badge>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No alumni yet. Set a beneficiary's lifecycle stage to “Alumni” when they complete the programme.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="hidden md:table-cell">Alumni since</TableHead>
                    <TableHead className="hidden md:table-cell">Years supported</TableHead>
                    <TableHead className="text-right">Total support</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(a => {
                    const name = a.display_name || `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || 'Unnamed';
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link to={`/beneficiaries/${a.beneficiary_code || a.id}`} className="font-medium hover:underline">
                            {name}
                          </Link>
                          {a.beneficiary_code && <span className="block text-xs text-muted-foreground">{a.beneficiary_code}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{alumniOutcomeLabel(a.alumni_outcome)}</Badge>
                          {a.alumni_outcome_note && (
                            <span className="block text-xs text-muted-foreground max-w-[220px] truncate">{a.alumni_outcome_note}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {a.alumni_since ? format(new Date(a.alumni_since), 'd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{a.yearsSupported}</TableCell>
                        <TableCell className="text-right font-mono text-sm">KES {a.totalSupport.toLocaleString()}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {a.alumni_contact_consent ? (
                            <span className="space-y-0.5 block">
                              {a.alumni_contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.alumni_contact_phone}</span>}
                              {a.alumni_contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{a.alumni_contact_email}</span>}
                              {!a.alumni_contact_phone && !a.alumni_contact_email && '—'}
                            </span>
                          ) : (
                            <span>No contact consent</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold mt-0.5">{value}</div>
      </CardContent>
    </Card>
  );
}
