import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInMonths } from 'date-fns';

// ---------- Types ----------
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
  unique_id?: string | null;
  consent_given?: boolean | null;
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

interface ProgrammeEntry {
  name: string;
  enrolled_date?: string | null;
  status?: string | null;
}

export interface BeneficiaryReportData {
  beneficiary: Beneficiary;
  guardians: Guardian[];
  donors: Donor[];
  academics?: AcademicRecord[];
  programmes?: ProgrammeEntry[];
  organizationName?: string;
  orgTagline?: string;
  orgContact?: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  servicesReceived?: number;
  attendancePct?: number;
  indicatorsMet?: number;
}

// ---------- Utilities ----------
function hexToRgb(hex: string | null | undefined): [number, number, number] {
  const fallback: [number, number, number] = [15, 123, 108]; // teal #0F7B6C
  if (!hex) return fallback;
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return fallback;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return fallback;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return a;
}

async function loadImageAsDataUrl(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result as string;
        const img = new Image();
        img.onload = () => resolve({ data, w: img.width, h: img.height });
        img.onerror = () => resolve(null);
        img.src = data;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function redactSurname(b: Beneficiary): string {
  // Keep first name + initial of last name
  const first = b.first_name || b.display_name.split(' ')[0] || '';
  const last = b.last_name || b.display_name.split(' ').slice(-1)[0] || '';
  return `${first}${last ? ' ' + last.charAt(0).toUpperCase() + '.' : ''}`.trim();
}

function buildStory(b: Beneficiary, guardians: Guardian[], donors: Donor[], programmes: ProgrammeEntry[]): string {
  const parts: string[] = [];
  const age = calcAge(b.date_of_birth);
  if (b.beneficiary_type === 'student') {
    const lead = age ? `${age}-year-old` : 'Student';
    const grade = b.grade ? ` in ${b.grade}` : '';
    const school = b.institution_name ? ` at ${b.institution_name}` : '';
    parts.push(`${lead}${grade}${school}.`);
  } else if (b.beneficiary_type === 'adult') {
    const lead = age ? `${age}-year-old adult` : 'Adult beneficiary';
    const income = b.source_of_income ? `, earning a living through ${b.source_of_income}` : '';
    parts.push(`${lead}${income}.`);
  } else {
    parts.push(`Community group${b.member_count ? ` of ${b.member_count} members` : ''}.`);
  }

  const activeDonor = donors[0];
  if (activeDonor) {
    const since = activeDonor.donation_date ? ` since ${format(new Date(activeDonor.donation_date), 'MMM yyyy')}` : '';
    parts.push(`Sponsored by ${activeDonor.donor_name}${since}.`);
  }

  const livingGuardians = guardians.filter(g => g.is_alive !== false);
  if (livingGuardians.length > 0) {
    const names = livingGuardians.slice(0, 2).map(g => `${g.relationship || g.guardian_type} ${g.full_name}`).join(' and ');
    parts.push(`Lives with ${names}.`);
  }

  if (programmes.length > 0) {
    parts.push(`Active in ${programmes.slice(0, 2).map(p => p.name).join(' and ')}.`);
  }

  if (b.future_ambition) {
    parts.push(`Dreams of becoming ${b.future_ambition.toLowerCase().startsWith('a ') || b.future_ambition.toLowerCase().startsWith('an ') ? b.future_ambition : 'a ' + b.future_ambition.toLowerCase()}.`);
  }

  return parts.join(' ');
}

// ---------- Hero PNG export ----------
export async function generateBeneficiaryHeroPng(data: BeneficiaryReportData): Promise<string | null> {
  const { beneficiary, primaryColor } = data;
  const consent = !!beneficiary.consent_given;
  const W = 1200, H = 500;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const [r, g, b] = hexToRgb(primaryColor || undefined);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  // accent bar
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, W, 8);

  // photo
  const photoBox = { x: 40, y: 60, s: 380 };
  if (consent && beneficiary.photo_url) {
    const img = await loadImageAsDataUrl(beneficiary.photo_url);
    if (img) {
      const im = new Image();
      await new Promise<void>((res) => { im.onload = () => res(); im.onerror = () => res(); im.src = img.data; });
      ctx.save();
      ctx.beginPath();
      ctx.rect(photoBox.x, photoBox.y, photoBox.s, photoBox.s);
      ctx.clip();
      ctx.drawImage(im, photoBox.x, photoBox.y, photoBox.s, photoBox.s);
      ctx.restore();
    } else {
      ctx.fillStyle = '#F1EFEA';
      ctx.fillRect(photoBox.x, photoBox.y, photoBox.s, photoBox.s);
    }
  } else {
    ctx.fillStyle = '#F1EFEA';
    ctx.fillRect(photoBox.x, photoBox.y, photoBox.s, photoBox.s);
    ctx.fillStyle = '#A8A29E';
    ctx.font = '120px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = (beneficiary.first_name?.[0] || '') + (beneficiary.last_name?.[0] || '');
    ctx.fillText(initials || '?', photoBox.x + photoBox.s / 2, photoBox.y + photoBox.s / 2);
  }
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.lineWidth = 4;
  ctx.strokeRect(photoBox.x, photoBox.y, photoBox.s, photoBox.s);

  // text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0A0F1E';
  ctx.font = '700 60px Georgia, "Times New Roman", serif';
  const name = consent ? beneficiary.display_name : redactSurname(beneficiary);
  ctx.fillText(name, 460, 90);
  ctx.font = '400 22px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#44403C';
  const age = calcAge(beneficiary.date_of_birth);
  const meta = [age ? `${age} years` : null, beneficiary.unique_id, beneficiary.county || beneficiary.location].filter(Boolean).join(' · ');
  ctx.fillText(meta, 460, 170);
  ctx.font = '600 18px Helvetica, Arial, sans-serif';
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(beneficiary.status.toUpperCase(), 460, 210);

  return canvas.toDataURL('image/png');
}

// ---------- Core PDF builder ----------
async function buildPdf(data: BeneficiaryReportData): Promise<jsPDF> {
  const {
    beneficiary, guardians, donors, academics = [], programmes = [],
    organizationName = 'Organization', orgTagline = '', orgContact = '',
    primaryColor, logoUrl,
    servicesReceived, attendancePct, indicatorsMet,
  } = data;

  const consent = !!beneficiary.consent_given;
  const accent = hexToRgb(primaryColor);
  const ink: [number, number, number] = [10, 15, 30];
  const muted: [number, number, number] = [120, 113, 108];
  const rule: [number, number, number] = [231, 226, 218];

  const doc = new jsPDF('p', 'mm', 'a4');
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 20; // margin

  // ----- Top band -----
  let y = M;
  const logo = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;
  if (logo) {
    const lh = 14;
    const lw = Math.min(40, (logo.w / logo.h) * lh);
    try { doc.addImage(logo.data, 'PNG', M, y, lw, lh); } catch { /* ignore */ }
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ink);
  doc.text(organizationName, PW - M, y + 5, { align: 'right' });
  if (orgTagline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(orgTagline, PW - M, y + 11, { align: 'right' });
  }
  y += 18;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.8);
  doc.line(M, y, PW - M, y);
  y += 6;

  // ----- Consent banner -----
  if (!consent) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(M, y, PW - 2 * M, 7, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('Consent not on file — limited export (photo and surname redacted)', M + 3, y + 4.7);
    y += 11;
  }

  // ----- Hero block -----
  const photoSize = 50;
  const heroTop = y;
  // Photo
  let drewPhoto = false;
  if (consent && beneficiary.photo_url) {
    const photo = await loadImageAsDataUrl(beneficiary.photo_url);
    if (photo) {
      try {
        doc.addImage(photo.data, 'JPEG', M, heroTop, photoSize, photoSize);
        drewPhoto = true;
      } catch { /* ignore */ }
    }
  }
  if (!drewPhoto) {
    doc.setFillColor(241, 239, 234);
    doc.rect(M, heroTop, photoSize, photoSize, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(168, 162, 158);
    const initials = (beneficiary.first_name?.[0] || beneficiary.display_name[0] || '?') + (consent ? (beneficiary.last_name?.[0] || '') : '');
    doc.text(initials.toUpperCase(), M + photoSize / 2, heroTop + photoSize / 2 + 6, { align: 'center' });
  }
  // Photo border
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.8);
  doc.rect(M, heroTop, photoSize, photoSize);

  // Name + meta
  const tx = M + photoSize + 8;
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...ink);
  const displayName = consent ? beneficiary.display_name : redactSurname(beneficiary);
  doc.text(displayName, tx, heroTop + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  const age = calcAge(beneficiary.date_of_birth);
  const metaParts = [
    age != null ? `${age} years` : null,
    beneficiary.gender,
    beneficiary.unique_id ? `ID ${beneficiary.unique_id}` : null,
    [beneficiary.estate_village, beneficiary.sub_county, beneficiary.county].filter(Boolean).join(', ') || beneficiary.location,
  ].filter(Boolean).join('  ·  ');
  doc.text(metaParts, tx, heroTop + 19);

  // Status pill
  doc.setFillColor(...accent);
  const pillLabel = beneficiary.status.toUpperCase();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const pillW = doc.getTextWidth(pillLabel) + 6;
  doc.roundedRect(tx, heroTop + 24, pillW, 5.5, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(pillLabel, tx + 3, heroTop + 27.8);

  // Story paragraph
  const story = buildStory(beneficiary, guardians, donors, programmes);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const storyLines = doc.splitTextToSize(story, PW - 2 * M - photoSize - 8);
  doc.text(storyLines, tx, heroTop + 36);

  y = heroTop + photoSize + 8;

  // ----- Two columns of key data -----
  const colGap = 6;
  const colW = (PW - 2 * M - colGap) / 2;
  const leftX = M;
  const rightX = M + colW + colGap;
  let leftY = y;
  let rightY = y;

  const renderSection = (xPos: number, yStart: number, title: string, rows: Array<[string, string | null | undefined]>): number => {
    const filtered = rows.filter(([, v]) => v != null && String(v).trim() !== '' && String(v) !== '-');
    if (filtered.length === 0) return yStart;
    let cy = yStart;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...accent);
    doc.text(title, xPos, cy);
    cy += 1.5;
    doc.setDrawColor(...rule);
    doc.setLineWidth(0.2);
    doc.line(xPos, cy, xPos + colW, cy);
    cy += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    filtered.forEach(([label, value]) => {
      doc.setTextColor(...muted);
      doc.text(label, xPos, cy);
      doc.setTextColor(...ink);
      const lines = doc.splitTextToSize(String(value), colW - 30);
      doc.text(lines, xPos + 30, cy);
      cy += Math.max(4.5, lines.length * 4);
    });
    return cy + 4;
  };

  // LEFT column
  leftY = renderSection(leftX, leftY, 'Personal', [
    ['Full name', consent ? beneficiary.display_name : redactSurname(beneficiary)],
    ['Gender', beneficiary.gender],
    ['Date of birth', beneficiary.date_of_birth ? format(new Date(beneficiary.date_of_birth), 'd MMM yyyy') : null],
    ['Religion', beneficiary.religion],
    ['Hobbies', beneficiary.hobbies],
    ['Ambition', beneficiary.future_ambition],
  ]);

  leftY = renderSection(leftX, leftY, 'Contact & Location', [
    ['Residence', beneficiary.location],
    ['County', beneficiary.county],
    ['Sub-county', beneficiary.sub_county],
    ['Village', beneficiary.estate_village],
    ['Home county', beneficiary.home_county],
  ]);

  if (guardians.length > 0) {
    const guardianRows: Array<[string, string]> = guardians.slice(0, 4).map(g => [
      g.relationship || g.guardian_type,
      `${g.full_name}${g.phone ? ` · ${g.phone}` : ''}${g.is_alive === false ? ' (deceased)' : ''}`
    ]);
    leftY = renderSection(leftX, leftY, 'Family', guardianRows);
  }

  // RIGHT column
  if (beneficiary.beneficiary_type === 'student') {
    rightY = renderSection(rightX, rightY, 'Education', [
      ['Level', beneficiary.academic_level],
      ['Grade', beneficiary.grade],
      ['School', beneficiary.institution_name],
      ['Course', beneficiary.course_name],
      ['Student ID', beneficiary.student_id_number],
      ['Enrolled', beneficiary.year_enrolled?.toString()],
    ]);
  } else if (beneficiary.beneficiary_type === 'adult') {
    rightY = renderSection(rightX, rightY, 'Livelihood', [
      ['Income source', beneficiary.source_of_income],
      ['Amount given', beneficiary.amount_given ? `KSH ${beneficiary.amount_given.toLocaleString()}` : null],
    ]);
  } else {
    rightY = renderSection(rightX, rightY, 'Group', [
      ['Name', beneficiary.group_name],
      ['Members', beneficiary.member_count?.toString()],
      ['Schedule', beneficiary.group_schedule],
      ['Leader', beneficiary.leader_name],
      ['Leader phone', beneficiary.leader_phone],
      ['Activities', beneficiary.group_activities?.join(', ')],
    ]);
  }

  if (beneficiary.beneficiary_type !== 'group') {
    rightY = renderSection(rightX, rightY, 'Health', [
      ['HIV status', beneficiary.hiv_status],
      ['Positive since', beneficiary.hiv_positive_since?.toString()],
      ['Special needs', beneficiary.has_special_needs ? (beneficiary.special_needs_details || 'Yes') : null],
      ['Other conditions', beneficiary.other_medical_conditions],
    ]);
  }

  if (programmes.length > 0) {
    rightY = renderSection(rightX, rightY, 'Programmes', programmes.slice(0, 5).map(p => [
      p.name,
      [p.status, p.enrolled_date ? `enrolled ${format(new Date(p.enrolled_date), 'MMM yyyy')}` : null].filter(Boolean).join(' · ') || '—',
    ]));
  }

  if (donors.length > 0) {
    const sponsorRows: Array<[string, string]> = donors.slice(0, 3).map(d => [
      d.donor_name,
      [
        d.amount_received ? `KSH ${d.amount_received.toLocaleString()}` : null,
        d.donation_date ? format(new Date(d.donation_date), 'MMM yyyy') : null,
      ].filter(Boolean).join(' · ') || '—'
    ]);
    rightY = renderSection(rightX, rightY, 'Sponsorship', sponsorRows);
  }

  y = Math.max(leftY, rightY) + 2;

  // ----- Impact panel -----
  const monthsSponsored = donors[0]?.donation_date
    ? Math.max(0, differenceInMonths(new Date(), new Date(donors[0].donation_date)))
    : 0;
  const impactMetrics: Array<[string, string]> = [
    [String(monthsSponsored), 'Months sponsored'],
    [String(servicesReceived ?? programmes.length), 'Services received'],
    [String(indicatorsMet ?? academics.length), 'Indicators / records'],
    [attendancePct != null ? `${attendancePct}%` : '—', 'Attendance'],
  ];

  // Try to fit panel on page; otherwise add page
  if (y > PH - 50) {
    doc.addPage();
    y = M;
  }
  const panelH = 28;
  doc.setFillColor(250, 249, 246);
  doc.setDrawColor(...rule);
  doc.roundedRect(M, y, PW - 2 * M, panelH, 2, 2, 'FD');
  const cellW = (PW - 2 * M) / impactMetrics.length;
  impactMetrics.forEach(([num, label], i) => {
    const cx = M + cellW * i + cellW / 2;
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...accent);
    doc.text(num, cx, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(label, cx, y + 19, { align: 'center' });
  });
  y += panelH + 6;

  // ----- Academic history (page 2 if rich) -----
  if (academics.length > 0 || donors.length > 3) {
    doc.addPage();
    let py = M;
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...ink);
    doc.text(`${consent ? beneficiary.display_name : redactSurname(beneficiary)} — Detailed history`, M, py);
    py += 2;
    doc.setDrawColor(...accent);
    doc.line(M, py + 2, PW - M, py + 2);
    py += 8;

    if (academics.length > 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...accent);
      doc.text('Academic performance', M, py);
      py += 3;
      autoTable(doc, {
        startY: py,
        head: [['Year', 'Term', 'Grade', 'Marks', 'Position', 'Remarks']],
        body: academics.map(a => [
          a.academic_year.toString(),
          a.term,
          a.overall_grade || '—',
          a.total_marks && a.out_of ? `${a.total_marks}/${a.out_of}` : '—',
          a.position?.toString() || '—',
          a.remarks || '—',
        ]),
        theme: 'grid',
        headStyles: { fillColor: accent, fontSize: 9, font: 'helvetica' },
        bodyStyles: { fontSize: 8, font: 'helvetica' },
        margin: { left: M, right: M },
      });
      py = (doc as any).lastAutoTable.finalY + 8;
    }

    if (donors.length > 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...accent);
      doc.text('Sponsorship history', M, py);
      py += 3;
      autoTable(doc, {
        startY: py,
        head: [['Sponsor', 'Amount (KSH)', 'Date', 'Notes']],
        body: donors.map(d => [
          d.donor_name,
          d.amount_received?.toLocaleString() || '—',
          d.donation_date ? format(new Date(d.donation_date), 'd MMM yyyy') : '—',
          d.notes || '—',
        ]),
        theme: 'grid',
        headStyles: { fillColor: accent, fontSize: 9, font: 'helvetica' },
        bodyStyles: { fontSize: 8, font: 'helvetica' },
        margin: { left: M, right: M },
      });
      py = (doc as any).lastAutoTable.finalY + 8;
    }

    if (beneficiary.background_narrative) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...accent);
      doc.text('Background', M, py);
      py += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...ink);
      const lines = doc.splitTextToSize(beneficiary.background_narrative, PW - 2 * M);
      doc.text(lines, M, py);
    }
  }

  // ----- Footer on every page -----
  const total = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    const footerY = PH - 8;
    doc.text(`Confidential — for the use of ${organizationName} and authorised sponsors only`, M, footerY);
    const right = [orgContact, `Generated ${format(new Date(), 'd MMM yyyy, HH:mm')}`].filter(Boolean).join('  ·  ');
    doc.text(right, PW - M, footerY, { align: 'right' });
    doc.text(`Page ${i} of ${total}`, PW / 2, footerY, { align: 'center' });
  }

  return doc;
}

// ---------- Public API ----------
export async function generateBeneficiaryReport(data: BeneficiaryReportData): Promise<void> {
  const doc = await buildPdf(data);
  const safeName = (data.beneficiary.display_name || 'beneficiary').replace(/\s+/g, '_');
  doc.save(`${safeName}_Profile_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export async function printBeneficiaryReport(data: BeneficiaryReportData): Promise<void> {
  const doc = await buildPdf(data);
  const url = doc.output('bloburl') as unknown as string;
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      try { win.focus(); win.print(); } catch { /* ignore */ }
    });
  }
}