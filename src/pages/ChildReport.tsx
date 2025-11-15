import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ChevronDown, ChevronUp, FileText, Calendar, MapPin, User, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { convertGoogleDriveUrl } from '@/lib/imageUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getCardStyles, type CardVariant } from '@/lib/cardStyles';

export default function ChildReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [homeVisits, setHomeVisits] = useState<any[]>([]);
  const [academicRecords, setAcademicRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Collapsible states
  const [profileOpen, setProfileOpen] = useState(true);
  const [educationOpen, setEducationOpen] = useState(true);
  const [academicOpen, setAcademicOpen] = useState(true);
  const [visitsOpen, setVisitsOpen] = useState(true);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);

  // Filter states
  const [visitFilter, setVisitFilter] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');

  useEffect(() => {
    if (id) {
      fetchReportData();
    }
  }, [id]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch child details
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('*')
        .eq('id', id)
        .single();

      if (childError) throw childError;
      setChild(childData);

      // Fetch child programs
      const { data: programsData, error: programsError } = await supabase
        .from('child_programs')
        .select(`
          *,
          programs:program_id (name, description)
        `)
        .eq('child_id', id);

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('child_id', id)
        .order('visit_date', { ascending: false });

      if (visitsError) throw visitsError;
      setVisits(visitsData || []);

      // Fetch home visit reports
      const { data: homeVisitsData, error: homeVisitsError } = await supabase
        .from('home_visit_reports')
        .select('*')
        .eq('student_id', id)
        .order('visit_date', { ascending: false });

      if (homeVisitsError) throw homeVisitsError;
      setHomeVisits(homeVisitsData || []);

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('child_id', id)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      // Fetch academic performance records
      const { data: academicData, error: academicError } = await supabase
        .from('activities')
        .select('*')
        .eq('child_id', id)
        .like('title', 'Academic Performance%')
        .order('activity_date', { ascending: false });

      if (academicError) throw academicError;
      setAcademicRecords(academicData || []);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredVisits = visits.filter(visit => 
    visit.visit_type?.toLowerCase().includes(visitFilter.toLowerCase()) ||
    visit.location?.toLowerCase().includes(visitFilter.toLowerCase()) ||
    visit.purpose?.toLowerCase().includes(visitFilter.toLowerCase())
  );

  const filteredHomeVisits = homeVisits.filter(visit =>
    visit.staff?.toLowerCase().includes(visitFilter.toLowerCase()) ||
    visit.reason_for_visit?.toLowerCase().includes(visitFilter.toLowerCase())
  );

  const filteredDocuments = documents.filter(doc =>
    doc.title?.toLowerCase().includes(documentFilter.toLowerCase()) ||
    doc.category?.toLowerCase().includes(documentFilter.toLowerCase())
  );

  const downloadPDF = async () => {
    if (!child) return;

    try {
      const pdf = new jsPDF();
      let yPosition = 20;

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Child Report', 105, yPosition, { align: 'center' });
      yPosition += 15;

      // Add profile picture if available
      if (child.photo_url) {
        try {
          const imageUrl = convertGoogleDriveUrl(child.photo_url);
          if (imageUrl) {
            pdf.addImage(imageUrl, 'JPEG', 20, yPosition, 40, 40);
          }
        } catch (error) {
          console.error('Error adding image to PDF:', error);
        }
      }

      // Personal Details
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Personal Details', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const personalDetails = [
        ['Full Name', `${child.first_name} ${child.last_name}`],
        ['Gender', child.gender || 'N/A'],
        ['Age', `${calculateAge(child.date_of_birth)} years`],
        ['Date of Birth', child.date_of_birth ? format(new Date(child.date_of_birth), 'PPP') : 'N/A'],
        ['Location', child.residence || 'N/A'],
        ['Address', child.address || 'N/A'],
        ['Status', child.status || 'N/A'],
        ['Guardian Name', child.guardian_name || 'N/A'],
        ['Guardian Phone', child.guardian_phone || 'N/A'],
        ['Guardian Email', child.guardian_email || 'N/A'],
      ];

      autoTable(pdf, {
        startY: yPosition,
        head: [['Field', 'Value']],
        body: personalDetails,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Education Information
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Education Information', 20, yPosition);
      yPosition += 10;

      const educationDetails = [
        ['Academic Level', child.academic_level || 'N/A'],
        ['Institution', child.institution_name || 'N/A'],
        ['Grade', child.grade || 'N/A'],
        ['Special Needs', child.special_needs || 'None'],
      ];

      autoTable(pdf, {
        startY: yPosition,
        head: [['Field', 'Value']],
        body: educationDetails,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Academic Performance Records
      if (academicRecords.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Academic Performance', 20, yPosition);
        yPosition += 10;

        const academicData = academicRecords.map(r => {
          const course = r.title?.replace('Academic Performance - ', '') || 'General';
          const year = r.description?.match(/Year: (\d{4})/)?.[1] || '';
          const term = r.description?.match(/Term: (Term [123])/)?.[1] || '';
          return [
            course,
            r.outcome || 'N/A',
            year,
            term,
          ];
        });

        autoTable(pdf, {
          startY: yPosition,
          head: [['Course', 'Grade', 'Year', 'Term']],
          body: academicData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Programs
      if (programs.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Enrolled Programs', 20, yPosition);
        yPosition += 10;

        const programsData = programs.map(p => [
          p.programs?.name || 'N/A',
          p.status || 'N/A',
          p.enrollment_date ? format(new Date(p.enrollment_date), 'PP') : 'N/A',
          p.completion_date ? format(new Date(p.completion_date), 'PP') : 'Ongoing',
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Program', 'Status', 'Enrolled', 'Completion']],
          body: programsData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Visit History
      if (visits.length > 0 || homeVisits.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Visit History (${visits.length + homeVisits.length} total visits)`, 20, yPosition);
        yPosition += 10;

        const visitsData = [
          ...visits.map(v => [
            v.visit_date ? format(new Date(v.visit_date), 'PP') : 'N/A',
            v.visit_type || 'N/A',
            v.location || 'N/A',
            v.purpose || 'N/A',
          ]),
          ...homeVisits.map(v => [
            v.visit_date ? format(new Date(v.visit_date), 'PP') : 'N/A',
            'Home Visit',
            v.location || 'N/A',
            v.reason_for_visit || 'N/A',
          ])
        ];

        autoTable(pdf, {
          startY: yPosition,
          head: [['Date', 'Type', 'Location', 'Purpose']],
          body: visitsData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Documents
      if (documents.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Documents', 20, yPosition);
        yPosition += 10;

        const documentsData = documents.map(d => [
          d.title || 'N/A',
          d.category || 'N/A',
          d.file_type || 'N/A',
          d.created_at ? format(new Date(d.created_at), 'PP') : 'N/A',
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Title', 'Category', 'Type', 'Date']],
          body: documentsData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Health & Welfare Notes
      if (child.medical_notes || child.special_condition) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Health & Welfare Notes', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        if (child.medical_notes) {
          pdf.text('Medical Notes:', 20, yPosition);
          yPosition += 7;
          const splitMedical = pdf.splitTextToSize(child.medical_notes, 170);
          pdf.text(splitMedical, 20, yPosition);
          yPosition += (splitMedical.length * 7) + 10;
        }

        if (child.special_condition) {
          pdf.text('Special Condition:', 20, yPosition);
          yPosition += 7;
          const splitCondition = pdf.splitTextToSize(child.special_condition, 170);
          pdf.text(splitCondition, 20, yPosition);
        }
      }

      // Save PDF
      pdf.save(`${child.first_name}_${child.last_name}_Report.pdf`);
      
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Child not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/children/${id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Button>
        <Button onClick={downloadPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
          <Card className={`${getCardStyles(0 as CardVariant)} hover-scale animate-fade-in`}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-4 border-primary/20">
                    {child.photo_url ? (
                      <AvatarImage 
                        src={convertGoogleDriveUrl(child.photo_url) || undefined}
                        alt={`${child.first_name} ${child.last_name}`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : null}
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                      {getInitials(child.first_name, child.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <CardTitle className="text-2xl">{child.first_name} {child.last_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      Child Profile Report
                    </CardDescription>
                  </div>
                </div>
                {profileOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <Separator />
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Personal Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gender:</span>
                        <span className="font-medium">{child.gender || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Age:</span>
                        <span className="font-medium">{calculateAge(child.date_of_birth)} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Birth:</span>
                        <span className="font-medium">
                          {child.date_of_birth ? format(new Date(child.date_of_birth), 'PPP') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <Badge variant="outline">{child.residence || 'N/A'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge>{child.status || 'N/A'}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Guardian Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{child.guardian_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{child.guardian_phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{child.guardian_email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Relation:</span>
                        <span className="font-medium">{child.relation || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Education Section */}
        <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
          <Card className={`${getCardStyles(1 as CardVariant)} hover-scale animate-fade-in`}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Education & Programs
                </CardTitle>
                {educationOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Academic Level</p>
                    <Badge variant="secondary">{child.academic_level || 'N/A'}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Institution</p>
                    <p className="font-medium">{child.institution_name || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="font-medium">{child.grade || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Special Needs</p>
                    <p className="font-medium">{child.special_needs || 'None'}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h3 className="font-semibold mb-3">Enrolled Programs ({programs.length})</h3>
                  {programs.length > 0 ? (
                    <div className="space-y-2">
                      {programs.map((program) => (
                        <div key={program.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium">{program.programs?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Enrolled: {program.enrollment_date ? format(new Date(program.enrollment_date), 'PP') : 'N/A'}
                            </p>
                          </div>
                          <Badge variant={program.status === 'active' ? 'default' : 'secondary'}>
                            {program.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No programs enrolled</p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Academic Performance Section */}
        <Collapsible open={academicOpen} onOpenChange={setAcademicOpen}>
          <Card className={`${getCardStyles(2 as CardVariant)} hover-scale animate-fade-in`}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Academic Performance ({academicRecords.length} records)
                </CardTitle>
                {academicOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {academicRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Course</th>
                          <th className="text-left p-3 font-semibold">Grade</th>
                          <th className="text-left p-3 font-semibold">Year</th>
                          <th className="text-left p-3 font-semibold">Term</th>
                          <th className="text-left p-3 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {academicRecords.map((record) => {
                          const course = record.title?.replace('Academic Performance - ', '') || 'General';
                          const year = record.description?.match(/Year: (\d{4})/)?.[1] || 'N/A';
                          const term = record.description?.match(/Term: (Term [123])/)?.[1] || 'N/A';
                          const notes = record.description?.split('\nNotes: ')[1] || '';
                          
                          return (
                            <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="p-3">{course}</td>
                              <td className="p-3">
                                <Badge variant="secondary">{record.outcome || 'N/A'}</Badge>
                              </td>
                              <td className="p-3">{year}</td>
                              <td className="p-3">{term}</td>
                              <td className="p-3 text-sm text-muted-foreground">{notes || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No academic performance records found</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Visits Section */}
        <Collapsible open={visitsOpen} onOpenChange={setVisitsOpen}>
          <Card className={`${getCardStyles(3 as CardVariant)} hover-scale animate-fade-in`}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Visit History ({visits.length + homeVisits.length} total)
                </CardTitle>
                {visitsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search visits by type, location, or purpose..."
                  value={visitFilter}
                  onChange={(e) => setVisitFilter(e.target.value)}
                  className="max-w-md"
                />
                
                <div className="space-y-3">
                  {filteredVisits.map((visit) => (
                    <div key={visit.id} className="p-4 border rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline" className="mb-2">{visit.visit_type}</Badge>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {visit.visit_date ? format(new Date(visit.visit_date), 'PPP') : 'N/A'}
                          </p>
                        </div>
                        {visit.location && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {visit.location}
                          </Badge>
                        )}
                      </div>
                      {visit.purpose && (
                        <p className="text-sm mb-2"><strong>Purpose:</strong> {visit.purpose}</p>
                      )}
                      {visit.findings && (
                        <p className="text-sm text-muted-foreground">{visit.findings}</p>
                      )}
                    </div>
                  ))}

                  {filteredHomeVisits.map((visit) => (
                    <div key={visit.id} className="p-4 border rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline" className="mb-2">Home Visit</Badge>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {visit.visit_date ? format(new Date(visit.visit_date), 'PPP') : 'N/A'}
                          </p>
                        </div>
                        {visit.location && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {visit.location}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mb-2"><strong>Staff:</strong> {visit.staff}</p>
                      {visit.reason_for_visit && (
                        <p className="text-sm mb-2"><strong>Reason:</strong> {visit.reason_for_visit}</p>
                      )}
                      {visit.observation_findings && (
                        <p className="text-sm text-muted-foreground">{visit.observation_findings}</p>
                      )}
                    </div>
                  ))}

                  {filteredVisits.length === 0 && filteredHomeVisits.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      {visitFilter ? 'No visits found matching your search' : 'No visits recorded'}
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Documents Section */}
        <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <Card className={`${getCardStyles(4 as CardVariant)} hover-scale animate-fade-in`}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({documents.length})
                </CardTitle>
                {documentsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search documents by title or category..."
                  value={documentFilter}
                  onChange={(e) => setDocumentFilter(e.target.value)}
                  className="max-w-md"
                />
                
                <div className="grid md:grid-cols-2 gap-3">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="p-4 border rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        </div>
                        <Badge variant="outline">{doc.category}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {doc.created_at ? format(new Date(doc.created_at), 'PP') : 'N/A'}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}

                  {filteredDocuments.length === 0 && (
                    <p className="text-muted-foreground text-sm col-span-2 text-center py-4">
                      {documentFilter ? 'No documents found matching your search' : 'No documents uploaded'}
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Health & Welfare Notes Section */}
        {(child.medical_notes || child.special_condition) && (
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <Card className={`${getCardStyles(5 as CardVariant)} hover-scale animate-fade-in`}>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Health & Welfare Notes</CardTitle>
                  {notesOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {child.medical_notes && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Medical Notes</h4>
                      <p className="text-sm text-muted-foreground">{child.medical_notes}</p>
                    </div>
                  )}
                  {child.special_condition && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Special Condition</h4>
                      <p className="text-sm text-muted-foreground">{child.special_condition}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>
    </div>
  );
}