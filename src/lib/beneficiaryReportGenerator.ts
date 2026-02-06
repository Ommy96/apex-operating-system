import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Beneficiary {
  id: string;
  beneficiary_type: 'student' | 'adult' | 'group';
  display_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  group_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url: string | null;
  status: string;
  location: string | null;
  county: string | null;
  sub_county: string | null;
  estate_village: string | null;
  home_county: string | null;
  academic_level: string | null;
  grade: string | null;
  institution_name: string | null;
  course_name: string | null;
  student_id_number: string | null;
  year_enrolled: number | null;
  member_count: number | null;
  group_schedule: string | null;
  group_activities: string[] | null;
  leader_name: string | null;
  leader_phone: string | null;
  source_of_income: string | null;
  amount_given: number | null;
  hiv_status: string | null;
  hiv_positive_since: number | null;
  has_special_needs: boolean | null;
  special_needs_details: string | null;
  other_medical_conditions: string | null;
  hobbies: string | null;
  future_ambition: string | null;
  religion: string | null;
  background_narrative: string | null;
  created_at: string;
}

interface Guardian {
  id: string;
  full_name: string;
  guardian_type: string;
  phone: string | null;
  email: string | null;
  is_alive: boolean | null;
  employment_type: string | null;
  source_of_income: string | null;
  relationship: string;
}

interface Donor {
  id: string;
  donor_name: string;
  amount_received: number | null;
  donation_date: string | null;
  notes: string | null;
}

interface AcademicRecord {
  id: string;
  academic_year: number;
  term: string;
  overall_grade: string | null;
  total_marks: number | null;
  out_of: number | null;
  position: number | null;
  remarks: string | null;
}

interface BeneficiaryReportData {
  beneficiary: Beneficiary;
  guardians: Guardian[];
  donors: Donor[];
  academics?: AcademicRecord[];
  organizationName?: string;
}

export async function generateBeneficiaryReport(data: BeneficiaryReportData): Promise<void> {
  const { beneficiary, guardians, donors, academics = [], organizationName = 'Organization' } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [30, 58, 95]; // Navy blue
  const textColor: [number, number, number] = [51, 51, 51];
  const mutedColor: [number, number, number] = [128, 128, 128];

  // Helper function to add a section header
  const addSectionHeader = (title: string) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 4, yPos + 5.5);
    yPos += 12;
    doc.setTextColor(...textColor);
  };

  // Helper function to add a field row
  const addFieldRow = (label: string, value: string | null | undefined, inline = false) => {
    if (yPos > 275) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedColor);
    doc.text(label + ':', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const labelWidth = doc.getTextWidth(label + ': ');
    doc.text(value || '-', margin + labelWidth + 2, yPos);
    if (!inline) yPos += 6;
  };

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BENEFICIARY PROFILE REPORT', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(organizationName, pageWidth / 2, 22, { align: 'center' });
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, 28, { align: 'center' });

  yPos = 45;

  // Profile Summary Box
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'S');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(beneficiary.display_name, margin + 5, yPos + 10);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  
  const typeLabel = beneficiary.beneficiary_type.charAt(0).toUpperCase() + beneficiary.beneficiary_type.slice(1);
  const statusBadge = `${typeLabel} | Status: ${beneficiary.status.toUpperCase()}`;
  doc.text(statusBadge, margin + 5, yPos + 18);
  
  if (beneficiary.date_of_birth) {
    const birthDate = new Date(beneficiary.date_of_birth);
    const age = Math.floor((new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    doc.text(`Age: ${age} years (DOB: ${format(birthDate, 'MMM d, yyyy')})`, margin + 5, yPos + 25);
  }
  
  if (beneficiary.gender) {
    doc.text(`Gender: ${beneficiary.gender}`, pageWidth - margin - 40, yPos + 18);
  }

  yPos += 40;

  // Personal Details
  addSectionHeader('PERSONAL INFORMATION');
  
  const personalFields = [
    ['First Name', beneficiary.first_name],
    ['Middle Name', beneficiary.middle_name],
    ['Last Name', beneficiary.last_name],
    ['Religion', beneficiary.religion],
    ['Hobbies', beneficiary.hobbies],
    ['Future Ambition', beneficiary.future_ambition],
  ];
  
  personalFields.forEach(([label, value]) => {
    if (value) addFieldRow(label, value);
  });
  yPos += 4;

  // Academic Information (for students)
  if (beneficiary.beneficiary_type === 'student') {
    addSectionHeader('ACADEMIC INFORMATION');
    addFieldRow('Academic Level', beneficiary.academic_level);
    addFieldRow('Grade/Year', beneficiary.grade);
    addFieldRow('Institution', beneficiary.institution_name);
    addFieldRow('Course', beneficiary.course_name);
    addFieldRow('Student ID', beneficiary.student_id_number);
    addFieldRow('Year Enrolled', beneficiary.year_enrolled?.toString());
    yPos += 4;
  }

  // Adult Self-Empowerment (for adults)
  if (beneficiary.beneficiary_type === 'adult') {
    addSectionHeader('SELF-EMPOWERMENT DETAILS');
    addFieldRow('Source of Income', beneficiary.source_of_income);
    addFieldRow('Amount Given (KSH)', beneficiary.amount_given?.toLocaleString());
    yPos += 4;
  }

  // Group Information (for groups)
  if (beneficiary.beneficiary_type === 'group') {
    addSectionHeader('GROUP INFORMATION');
    addFieldRow('Group Name', beneficiary.group_name);
    addFieldRow('Member Count', beneficiary.member_count?.toString());
    addFieldRow('Meeting Schedule', beneficiary.group_schedule);
    addFieldRow('Leader Name', beneficiary.leader_name);
    addFieldRow('Leader Phone', beneficiary.leader_phone);
    if (beneficiary.group_activities?.length) {
      addFieldRow('Activities', beneficiary.group_activities.join(', '));
    }
    yPos += 4;
  }

  // Location Details
  addSectionHeader('LOCATION');
  addFieldRow('Location/Residence', beneficiary.location);
  addFieldRow('County', beneficiary.county);
  addFieldRow('Sub-County', beneficiary.sub_county);
  addFieldRow('Estate/Village', beneficiary.estate_village);
  addFieldRow('Home County', beneficiary.home_county);
  yPos += 4;

  // Medical Information (for non-groups)
  if (beneficiary.beneficiary_type !== 'group') {
    addSectionHeader('MEDICAL INFORMATION');
    addFieldRow('HIV Status', beneficiary.hiv_status);
    if (beneficiary.hiv_positive_since) {
      addFieldRow('HIV Positive Since', beneficiary.hiv_positive_since.toString());
    }
    addFieldRow('Special Needs', beneficiary.has_special_needs ? 'Yes' : 'No');
    if (beneficiary.special_needs_details) {
      addFieldRow('Special Needs Details', beneficiary.special_needs_details);
    }
    if (beneficiary.other_medical_conditions) {
      addFieldRow('Other Conditions', beneficiary.other_medical_conditions);
    }
    yPos += 4;
  }

  // Guardians Table
  if (guardians.length > 0 && beneficiary.beneficiary_type !== 'group') {
    addSectionHeader('GUARDIANS');
    
    autoTable(doc, {
      startY: yPos,
      head: [['Name', 'Relationship', 'Type', 'Phone', 'Status']],
      body: guardians.map(g => [
        g.full_name,
        g.relationship,
        g.guardian_type,
        g.phone || '-',
        g.is_alive ? 'Alive' : 'Deceased'
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Donors Table
  if (donors.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = margin;
    }
    addSectionHeader('DONORS/SPONSORS');
    
    autoTable(doc, {
      startY: yPos,
      head: [['Donor Name', 'Amount (KSH)', 'Date', 'Notes']],
      body: donors.map(d => [
        d.donor_name,
        d.amount_received?.toLocaleString() || '-',
        d.donation_date ? format(new Date(d.donation_date), 'MMM d, yyyy') : '-',
        d.notes || '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Academic Records Table (for students)
  if (academics.length > 0 && beneficiary.beneficiary_type === 'student') {
    if (yPos > 220) {
      doc.addPage();
      yPos = margin;
    }
    addSectionHeader('ACADEMIC PERFORMANCE HISTORY');
    
    autoTable(doc, {
      startY: yPos,
      head: [['Year', 'Term', 'Grade', 'Marks', 'Position', 'Remarks']],
      body: academics.map(a => [
        a.academic_year.toString(),
        a.term,
        a.overall_grade || '-',
        a.total_marks && a.out_of ? `${a.total_marks}/${a.out_of}` : '-',
        a.position?.toString() || '-',
        a.remarks || '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Background Narrative
  if (beneficiary.background_narrative) {
    if (yPos > 230) {
      doc.addPage();
      yPos = margin;
    }
    addSectionHeader('BACKGROUND NARRATIVE');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(beneficiary.background_narrative, pageWidth - 2 * margin - 10);
    doc.text(splitText, margin + 5, yPos);
    yPos += splitText.length * 5 + 10;
  }

  // Footer on all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(
      `Page ${i} of ${pageCount} | Confidential - ${organizationName}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  const fileName = `${beneficiary.display_name.replace(/\s+/g, '_')}_Profile_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
