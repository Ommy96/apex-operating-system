import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Heart, Users, FileText, Download, GraduationCap, MapPin,
  Calendar, LogOut, User, ChevronRight, School, Building2,
  BookOpen, TrendingUp, Eye, ArrowLeft, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export default function DonorPortal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const {
    donorAccount, sponsoredBeneficiaries, donorDocuments,
    fetchBeneficiaryAcademics, fetchBeneficiaryProgression,
    getDocumentDownloadUrl, isLoading, documentsLoading, isDonor,
  } = useDonorPortal();

  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null);
  const [academics, setAcademics] = useState<any[]>([]);
  const [progression, setProgression] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // Not signed in at all → send to donor login
  if (!user) return <Navigate to="/donor/login" replace />;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/donor/login');
  };

  // Signed in but no linked donor account → show a friendly explanation
  // instead of silently bouncing to the login screen.
  if (!isDonor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
        <Card className="max-w-md w-full border-border/50 shadow-lg">
          <CardContent className="p-8 text-center space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-7 w-7 text-warning" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">No donor account linked</h1>
              <p className="text-sm text-muted-foreground">
                You're signed in as <span className="font-medium text-foreground">{user.email}</span>,
                but this email isn't linked to a donor account in this organization.
              </p>
              <p className="text-xs text-muted-foreground pt-2">
                If you're a donor, ask the organization admin to provision your portal access.
                If you're a staff member, use the main app instead.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => navigate('/')} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" /> Go to main app
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleViewBeneficiary = async (beneficiaryId: string) => {
    setSelectedBeneficiary(beneficiaryId);
    setLoadingDetail(true);
    try {
      const [acad, prog] = await Promise.all([
        fetchBeneficiaryAcademics(beneficiaryId),
        fetchBeneficiaryProgression(beneficiaryId),
      ]);
      setAcademics(acad);
      setProgression(prog);
    } catch {
      toast.error('Failed to load details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownload = async (fileUrl: string, title: string) => {
    try {
      const url = await getDocumentDownloadUrl(fileUrl);
      if (url) {
        window.open(url, '_blank');
        toast.success(`Downloading ${title}`);
      } else {
        toast.error('Could not generate download link');
      }
    } catch {
      toast.error('Download failed');
    }
  };

  const totalSponsored = sponsoredBeneficiaries?.length || 0;
  const totalContributed = sponsoredBeneficiaries?.reduce(
    (sum, bd) => sum + (bd.amount_received || 0), 0
  ) || 0;
  const selectedData = sponsoredBeneficiaries?.find(
    (b) => b.beneficiary?.id === selectedBeneficiary
  );

  const docsByType = {
    progress_report: donorDocuments?.filter(d => (d as any).document_type === 'progress_report') || [],
    thank_you_letter: donorDocuments?.filter(d => (d as any).document_type === 'thank_you_letter') || [],
    audit_report: donorDocuments?.filter(d => (d as any).document_type === 'audit_report') || [],
    program_report: donorDocuments?.filter(d => (d as any).document_type === 'program_report') || [],
    other: donorDocuments?.filter(d => !['progress_report', 'thank_you_letter', 'audit_report', 'program_report'].includes((d as any).document_type)) || [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg leading-tight">Donor Portal</h1>
              <p className="text-xs text-muted-foreground">Welcome, {donorAccount?.donor_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalSponsored}</p>
                <p className="text-sm text-muted-foreground">Sponsored Beneficiaries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  KES {totalContributed.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Contributed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{donorDocuments?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Documents Available</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="beneficiaries" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="beneficiaries" className="gap-2">
              <Users className="h-4 w-4" /> My Beneficiaries
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" /> Documents
            </TabsTrigger>
          </TabsList>

          {/* Beneficiaries Tab */}
          <TabsContent value="beneficiaries">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Beneficiary List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                  Sponsored Beneficiaries
                </h3>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2 pr-2">
                    {sponsoredBeneficiaries?.map((bd) => {
                      const b = bd.beneficiary as any;
                      if (!b) return null;
                      const isSelected = selectedBeneficiary === b.id;
                      return (
                        <Card
                          key={bd.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-primary shadow-md' : 'border-border/50'
                          }`}
                          onClick={() => handleViewBeneficiary(b.id)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <Avatar className="h-11 w-11">
                              <AvatarImage src={b.photo_url} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {(b.first_name?.[0] || b.display_name?.[0] || '?').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">
                                {b.display_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {b.beneficiary_type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{b.grade || ''}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      );
                    })}
                    {totalSponsored === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No sponsored beneficiaries yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Beneficiary Detail */}
              <div className="lg:col-span-2">
                {selectedBeneficiary && selectedData ? (
                  <BeneficiaryDetail
                    data={selectedData}
                    academics={academics}
                    progression={progression}
                    loading={loadingDetail}
                  />
                ) : (
                  <Card className="border-border/50 h-[600px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Select a beneficiary</p>
                      <p className="text-sm mt-1">Click on a beneficiary to view their profile and progress</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="space-y-6">
              <DocumentSection
                title="Progress Reports"
                icon={<BookOpen className="h-5 w-5 text-primary" />}
                docs={docsByType.progress_report}
                onDownload={handleDownload}
              />
              <DocumentSection
                title="Thank You Letters"
                icon={<Heart className="h-5 w-5 text-pink-500" />}
                docs={docsByType.thank_you_letter}
                onDownload={handleDownload}
              />
              <DocumentSection
                title="Audit Reports"
                icon={<FileText className="h-5 w-5 text-amber-500" />}
                docs={docsByType.audit_report}
                onDownload={handleDownload}
              />
              <DocumentSection
                title="Program Reports"
                icon={<Building2 className="h-5 w-5 text-accent" />}
                docs={docsByType.program_report}
                onDownload={handleDownload}
              />
              {docsByType.other.length > 0 && (
                <DocumentSection
                  title="Other Documents"
                  icon={<FileText className="h-5 w-5 text-muted-foreground" />}
                  docs={docsByType.other}
                  onDownload={handleDownload}
                />
              )}
              {(donorDocuments?.length || 0) === 0 && (
                <Card className="border-border/50">
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No documents available yet</p>
                    <p className="text-sm mt-1">Documents shared by the organization will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function BeneficiaryDetail({ data, academics, progression, loading }: {
  data: any;
  academics: any[];
  progression: any[];
  loading: boolean;
}) {
  const b = data.beneficiary;
  if (!b) return null;

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={b.photo_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {(b.first_name?.[0] || b.display_name?.[0] || '?').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{b.display_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className="bg-primary/10 text-primary border-0">{b.beneficiary_type}</Badge>
              <Badge variant={b.status === 'active' ? 'default' : 'secondary'}>{b.status}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {b.gender && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Gender</p>
              <p className="font-medium text-foreground capitalize">{b.gender}</p>
            </div>
          )}
          {b.date_of_birth && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Date of Birth</p>
              <p className="font-medium text-foreground">{format(new Date(b.date_of_birth), 'MMM d, yyyy')}</p>
            </div>
          )}
          {b.grade && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Grade</p>
              <p className="font-medium text-foreground">{b.grade}</p>
            </div>
          )}
          {b.academic_level && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Academic Level</p>
              <p className="font-medium text-foreground capitalize">{b.academic_level}</p>
            </div>
          )}
          {b.institution_name && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Institution</p>
              <p className="font-medium text-foreground flex items-center gap-1">
                <School className="h-3.5 w-3.5" />{b.institution_name}
              </p>
            </div>
          )}
          {b.county && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">County</p>
              <p className="font-medium text-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />{b.county}
              </p>
            </div>
          )}
          {data.amount_received && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Your Contribution</p>
              <p className="font-medium text-success">KES {data.amount_received.toLocaleString()}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Academics */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Academic Performance
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : academics.length > 0 ? (
            <div className="space-y-2">
              {academics.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                  <div>
                    <span className="font-medium text-foreground">{a.academic_year} - {a.term}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.total_marks != null && (
                      <span className="text-foreground font-semibold">
                        {a.total_marks}{a.out_of ? `/${a.out_of}` : ''}
                      </span>
                    )}
                    {a.overall_grade && (
                      <Badge variant="outline">{a.overall_grade}</Badge>
                    )}
                    {a.position && (
                      <span className="text-xs text-muted-foreground">Pos: {a.position}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-3">No academic records available</p>
          )}
        </div>

        {/* Progression */}
        {progression.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Academic Progression
            </h3>
            <div className="space-y-2">
              {progression.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {p.previous_grade || '—'} → {p.new_grade || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.progression_date), 'MMM d, yyyy')} · {p.progression_type}
                    </p>
                  </div>
                  {p.is_repeating && <Badge variant="destructive" className="text-xs">Repeating</Badge>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentSection({ title, icon, docs, onDownload }: {
  title: string;
  icon: React.ReactNode;
  docs: any[];
  onDownload: (url: string, title: string) => void;
}) {
  if (docs.length === 0) return null;
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{doc.title}</p>
                {doc.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                </p>
              </div>
              {doc.current_file_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 shrink-0"
                  onClick={() => onDownload(doc.current_file_url, doc.title)}
                >
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
