import * as XLSX from 'xlsx';

export const downloadExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-width columns based on content
  const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
};

export const formatFeedingProgramData = (programs: any[]) => {
  return programs.map(program => ({
    'Name': program.name,
    'Type': program.type || 'Not specified',
    'Gender': program.gender || 'Not specified',
    'Academic Level': program.academic_level || 'Not specified',
    'Grade': program.grade || 'Not specified',
    'Contact': program.contact || 'Not specified',
    'Education Sponsorship': program.education_sponsorship ? 'Yes' : 'No',
    'Created Date': new Date(program.created_at).toLocaleDateString(),
  }));
};

export const formatActivityReportsData = (reports: any[]) => {
  return reports.map(report => ({
    'Staff': report.staff,
    'Program': report.program,
    'Reporting Date': new Date(report.reporting_date).toLocaleDateString(),
    'Executive Summary': report.executive_summary,
    'Beneficiary Impact': report.beneficiary_impact,
    'Challenges': report.challenges,
    'Recommendations': report.proposed_recommendations,
    'Created Date': new Date(report.created_at).toLocaleDateString(),
  }));
};

export const formatKipawaSatoData = (records: any[]) => {
  return records.map(record => ({
    'Full Name': record.full_name,
    'Age': record.age || 'Not specified',
    'Gender': record.gender || 'Not specified',
    'Academic Level': record.academic_level || 'Not specified',
    'Location': record.location || 'Not specified',
    'Talent Category': record.talent_category || 'Not specified',
    'Specific Skill': record.specific_skill || 'Not specified',
    'Year Enrolled': record.year_enrolled || 'Not specified',
    'School Support': record.school_support_given ? 'Yes' : 'No',
    'Coach/Mentor': record.coach_mentor_name || 'Not specified',
    'Awards/Recognition': record.awards_recognition || 'None',
    'Created Date': new Date(record.created_at).toLocaleDateString(),
  }));
};

export const formatSelfEmpowermentData = (records: any[]) => {
  return records.map(record => ({
    'Full Name': record.full_name,
    'Applicant ID': record.applicant_id || 'Not specified',
    'Gender': record.gender || 'Not specified',
    'Residence': record.residence || 'Not specified',
    'Contact': record.contact || 'Not specified',
    'Business Name': record.business_name || 'Not specified',
    'Business Type': record.type_of_business || 'Not specified',
    'Business Location': record.business_location || 'Not specified',
    'Amount Requested': record.amount_requested || 0,
    'Amount Approved': record.amount_approved || 0,
    'Amount Status': record.amount_status || 'Not specified',
    'Support Status': record.support_status || 'Not specified',
    'Current Status': record.current_status || 'Not specified',
    'Start Date': record.start_date ? new Date(record.start_date).toLocaleDateString() : 'Not specified',
    'Created Date': new Date(record.created_at).toLocaleDateString(),
  }));
};

export const formatSupportGroupsData = (groups: any[]) => {
  return groups.map(group => ({
    'Name': group.name,
    'Description': group.description || 'No description',
    'Location': group.location || 'Not specified',
    'Facilitator': group.facilitator || 'Not specified',
    'Member Count': group.member_count || 0,
    'Meeting Schedule': group.meeting_schedule || 'Not specified',
    'Created Date': new Date(group.created_at).toLocaleDateString(),
  }));
};

export const formatDocumentsData = (documents: any[]) => {
  return documents.map(doc => ({
    'Document Title': doc.title,
    'File Name': doc.file_name,
    'Student': doc.children ? `${doc.children.first_name} ${doc.children.last_name}` : 'N/A',
    'Category': doc.category || 'Uncategorized',
    'File Type': doc.file_type || 'Unknown',
    'Upload Date': new Date(doc.created_at).toLocaleDateString(),
  }));
};

export const formatFamilyAdoptionData = (families: any[]) => {
  return families.map(family => ({
    'Known Name': family.known_name,
    'Actual Name': family.actual_name || 'Not specified',
    'Gender': family.gender || 'Not specified',
    'Category': family.category || 'Not specified',
    'Residence': family.residence || 'Not specified',
    'Family Status': family.family_status || 'Not specified',
    'Source of Income': family.source_of_income || 'Not specified',
    'Family Profile': family.family_profile || 'Not specified',
    'Sponsor': family.sponsor || 'Not specified',
    'Number of Beneficiaries': family.no_of_beneficiaries || 0,
    'Created Date': new Date(family.created_at).toLocaleDateString(),
  }));
};

export const formatProgramReportsData = (reports: any[]) => {
  return reports.map(report => ({
    'Staff': report.staff,
    'Program': report.program,
    'Reporting Date': new Date(report.reporting_date).toLocaleDateString(),
    'Executive Summary': report.executive_summary,
    'Beneficiary Impact': report.beneficiary_impact,
    'Challenges': report.challenges,
    'Recommendations': report.proposed_recommendations,
    'Created Date': new Date(report.created_at).toLocaleDateString(),
  }));
};

export const formatHomeVisitReportsData = (reports: any[]) => {
  return reports.map(report => ({
    'Staff': report.staff,
    'Visit Date': new Date(report.visit_date).toLocaleDateString(),
    'Location': report.location || 'Not specified',
    'Student ID': report.student_id || 'Not specified',
    'Reason for Visit': report.reason_for_visit || 'Not specified',
    'Observation Findings': report.observation_findings,
    'Challenges Identified': report.challenges_identified,
    'Recommendations': report.recommendations,
    'Created Date': new Date(report.created_at).toLocaleDateString(),
  }));
};

export const formatSchoolVisitReportsData = (reports: any[]) => {
  return reports.map(report => ({
    'Staff': report.staff,
    'School': report.school,
    'Visit Date': new Date(report.visit_date).toLocaleDateString(),
    'Location': report.location || 'Not specified',
    'Reason for Visit': report.reason_for_visit || 'Not specified',
    'Observation Findings': report.observation_findings,
    'Challenges Identified': report.challenges_identified,
    'Recommendations': report.recommendations,
    'Created Date': new Date(report.created_at).toLocaleDateString(),
  }));
};

export const formatEducationData = (children: any[]) => {
  return children.map(child => ({
    'Student ID': child.student_id || 'Not specified',
    'First Name': child.first_name,
    'Last Name': child.last_name,
    'Gender': child.gender || 'Not specified',
    'Date of Birth': child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : 'Not specified',
    'Photo URL': child.photo_url || 'Not specified',
    'Residence': child.residence || 'Not specified',
    'Academic Level': child.academic_level || 'Not specified',
    'Grade/Form/Year': child.grade || 'Not specified',
    'Institution': child.institution_name || 'Not specified',
    'Parental Status': child.parental_status || 'Not specified',
    'Guardian Name': child.guardian_name || 'Not specified',
    'Relation': child.relation || 'Not specified',
    'Guardian Phone': child.guardian_phone || 'Not specified',
    'Medical Notes': child.medical_notes || 'None',
    'Special Needs': child.special_needs || 'None',
    'Donor': child.donor || 'Not specified',
    'Donation Received (KSH)': child.donation_received_ksh || 0,
    'Status': child.status,
    'Enrollment Date': child.enrollment_date ? new Date(child.enrollment_date).toLocaleDateString() : 'Not specified',
    'Created Date': new Date(child.created_at).toLocaleDateString(),
  }));
};