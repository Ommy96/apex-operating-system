import { useMemo } from 'react';
import { format, differenceInYears } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  GraduationCap, MapPin, School, TrendingUp, Calendar, ShieldCheck, FileText, Heart,
} from 'lucide-react';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { useDonorFx } from '@/hooks/useDonorFx';
import { FxAmount } from './FxAmount';
import { toast } from 'sonner';

/**
 * Sponsor share mode, rendered in-app.
 * NEVER shows: surname, exact location (village/sub-county), guardian details,
 * contact details, sensitive life events or other donors' contributions.
 */
export function SponsorBeneficiaryDetail({
  data, academics, progression, loading,
}: { data: any; academics: any[]; progression: any[]; loading: boolean }) {
  const b = data?.beneficiary;
  const { enrollments, sharedBeneficiaryDocuments, getSharedDocumentUrl, currency } = useDonorPortal();
  const fx = useDonorFx(currency);

  const myEnrollments = useMemo(
    () => (enrollments || []).filter((e: any) => e.beneficiary_id === b?.id),
    [enrollments, b?.id],
  );
  const myDocs = useMemo(
    () => (sharedBeneficiaryDocuments || []).filter((d: any) => d.beneficiary_id === b?.id),
    [sharedBeneficiaryDocuments, b?.id],
  );

  if (!b) return null;

  const consented = !!b.consent_given;
  const age = b.date_of_birth ? differenceInYears(new Date(), new Date(b.date_of_birth)) : null;
  const hobbies: string[] = Array.isArray(b.hobbies_list) ? b.hobbies_list : [];
  const interests: string[] = Array.isArray(b.interests) ? b.interests : [];

  const openDoc = async (doc: any) => {
    const url = await getSharedDocumentUrl(doc);
    if (url) window.open(url, '_blank', 'noopener');
    else toast.error('Could not open this document');
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {consented && b.photo_url ? <AvatarImage src={b.photo_url} alt="" /> : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {(b.first_name?.[0] || b.display_name?.[0] || '?').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {b.first_name || (b.display_name || '').split(' ')[0]}
            </h2>
            <p className="text-xs font-mono text-muted-foreground">{b.beneficiary_code}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {age != null && <Badge variant="secondary">{age} years</Badge>}
              {b.county && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" /> {b.county}
                </Badge>
              )}
              <Badge variant={b.status === 'active' ? 'default' : 'secondary'}>{b.status}</Badge>
            </div>
          </div>
        </div>

        {!consented && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Photo hidden — no photo release consent on file.
          </p>
        )}

        {/* Bio */}
        {b.bio && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Who they are</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{b.bio}</p>
            </div>
          </>
        )}

        {(hobbies.length > 0 || interests.length > 0 || b.career_ambition || b.favourite_subject) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {b.career_ambition && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Career ambition</p>
                <p className="font-medium text-foreground">{b.career_ambition}</p>
              </div>
            )}
            {b.favourite_subject && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Favourite subject</p>
                <p className="font-medium text-foreground">{b.favourite_subject}</p>
              </div>
            )}
            {hobbies.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Hobbies</p>
                <div className="flex flex-wrap gap-1.5">
                  {hobbies.map((h) => <Badge key={h} variant="secondary" className="text-[11px]">{h}</Badge>)}
                </div>
              </div>
            )}
            {interests.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((h) => <Badge key={h} variant="outline" className="text-[11px]">{h}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Programmes */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" /> Programmes they're in
          </h3>
          {myEnrollments.length ? (
            <div className="space-y-2">
              {myEnrollments.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {e.program?.name || 'Programme'}
                      {e.project?.name || e.project_name ? ` · ${e.project?.name || e.project_name}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.enrolled_date ? `Enrolled ${format(new Date(e.enrolled_date), 'MMM yyyy')}` : 'Enrolment date not recorded'}
                    </p>
                  </div>
                  <Badge variant={String(e.status).toLowerCase() === 'active' ? 'default' : 'secondary'}>
                    {e.status || 'active'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No programme enrolments recorded yet.</p>
          )}
        </div>

        {/* Education */}
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {b.academic_level && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Education level</p>
              <p className="font-medium text-foreground capitalize">{b.academic_level}</p>
            </div>
          )}
          {b.grade && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Grade</p>
              <p className="font-medium text-foreground">{b.grade}</p>
            </div>
          )}
          {b.institution_name && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">School</p>
              <p className="font-medium text-foreground flex items-center gap-1">
                <School className="h-3.5 w-3.5" />{b.institution_name}
              </p>
            </div>
          )}
          {data.amount_received ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your contribution</p>
              <FxAmount
                amount={Number(data.amount_received)}
                currency="KES"
                on={data.donation_date}
                fx={fx}
                className="font-medium text-success"
              />
            </div>
          ) : null}
        </div>

        {/* Academics */}
        <Separator />
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Recent progress
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : academics.length ? (
            <div className="space-y-2">
              {academics.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                  <span className="font-medium text-foreground">{a.academic_year} · {a.term}</span>
                  <div className="flex items-center gap-3">
                    {a.total_marks != null && (
                      <span className="font-semibold text-foreground">
                        {a.total_marks}{a.out_of ? `/${a.out_of}` : ''}
                      </span>
                    )}
                    {a.overall_grade && <Badge variant="outline">{a.overall_grade}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No academic records shared yet.</p>
          )}
        </div>

        {/* Milestones (non-sensitive progression only) */}
        {progression.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Milestones
            </h3>
            <div className="space-y-2">
              {progression.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{p.previous_grade || '—'} → {p.new_grade || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.progression_date), 'MMM d, yyyy')} · {p.progression_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared documents */}
        <Separator />
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Documents shared with you
          </h3>
          {myDocs.length ? (
            <div className="space-y-2">
              {myDocs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{d.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.document_type || 'document'} · {format(new Date(d.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openDoc(d)}>View</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No documents have been shared for this beneficiary.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
