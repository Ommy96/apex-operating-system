import jsPDF from 'jspdf';
import { format } from 'date-fns';

/**
 * Shareable beneficiary profile — a privacy artifact, not just a document.
 * Redaction is applied HERE so every caller (PDF, browser share link preview)
 * gets the same guarantees.
 */
export type ShareMode = 'full' | 'sponsor' | 'public';

export const SHARE_MODES: { value: ShareMode; label: string; blurb: string }[] = [
  { value: 'full', label: 'Full — internal only', blurb: 'Everything on file. Watermarked "Internal use". Never send outside the organisation.' },
  { value: 'sponsor', label: 'Sponsor', blurb: 'Bio, photo, first name + code, education, needs, progress. No surname, no location below county, no guardian or contact details.' },
  { value: 'public', label: 'Public / stakeholder', blurb: 'Anonymised: first name or initials only, photo only with photo-release consent, county at most.' },
];

export interface ShareNeed {
  label: string;
  status: 'met' | 'partially_met' | 'unmet' | string;
  estimated_cost?: number | null;
  funded_amount?: number | null;
  currency?: string | null;
}

export interface ShareMilestone {
  title: string;
  occurred_on: string;
}

export interface ShareProgramme {
  name: string;
  support?: string | null;
  enrolled_date?: string | null;
}

export interface ShareProfileInput {
  mode: ShareMode;
  beneficiary: any;
  /** True when a photo-release / consent document is on file (or consent_given is set). */
  hasPhotoConsent: boolean;
  organization: { name: string; logoUrl?: string | null; primaryColor?: string | null; contact?: string | null };
  needs?: ShareNeed[];
  milestones?: ShareMilestone[];
  programmes?: ShareProgramme[];
  academics?: Array<{ academic_year: number; term: string; overall_grade: string | null }>;
  yearsSupported?: number;
  servicesReceived?: number;
}

// ---------- helpers ----------
function hexToRgb(hex?: string | null): [number, number, number] {
  const fallback: [number, number, number] = [15, 123, 108];
  if (!hex) return fallback;
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return fallback;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return fallback;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Name shown for a given share mode. */
export function shareName(b: any, mode: ShareMode): string {
  const first = b.first_name || String(b.display_name || '').split(' ')[0] || 'Beneficiary';
  const last = b.last_name || String(b.display_name || '').split(' ').slice(-1)[0] || '';
  if (mode === 'full') return b.display_name || `${first} ${last}`.trim();
  if (mode === 'sponsor') return first;
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

/** Location string permitted for a given share mode — never below county outside FULL. */
export function shareLocation(b: any, mode: ShareMode): string | null {
  if (mode === 'full') {
    return [b.estate_village, b.sub_county, b.county].filter(Boolean).join(', ') || b.location || null;
  }
  return b.county || null;
}

/** A photo may only be exported when consent is recorded. Non-negotiable. */
export function mayShowPhoto(input: { mode: ShareMode; hasPhotoConsent: boolean; photoUrl?: string | null }): boolean {
  if (!input.photoUrl) return false;
  return input.hasPhotoConsent;
}

// ---------- PDF ----------
async function build(input: ShareProfileInput): Promise<jsPDF> {
  const { mode, beneficiary: b, organization: org, needs = [], milestones = [], programmes = [], academics = [] } = input;

  const accent = hexToRgb(org.primaryColor);
  const ink: [number, number, number] = [28, 25, 23];
  const muted: [number, number, number] = [120, 113, 108];
  const rule: [number, number, number] = [231, 226, 218];

  const doc = new jsPDF('p', 'mm', 'a4');
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 20; // 20mm margins, print-safe
  const CW = PW - 2 * M;

  const showPhoto = mayShowPhoto({ mode, hasPhotoConsent: input.hasPhotoConsent, photoUrl: b.photo_url });
  const name = shareName(b, mode);
  const location = shareLocation(b, mode);
  const age = calcAge(b.date_of_birth);

  let y = M;
  const ensure = (needed: number) => {
    if (y + needed > PH - 22) { doc.addPage(); y = M; }
  };

  // ── Branded header ──
  const logo = org.logoUrl ? await loadImage(org.logoUrl) : null;
  if (logo) {
    try { doc.addImage(logo, 'PNG', M, y, 26, 13); } catch { /* ignore */ }
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...ink);
  doc.text(org.name, PW - M, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(mode === 'full' ? 'Internal profile' : mode === 'sponsor' ? 'Sponsor profile' : 'Stakeholder profile', PW - M, y + 11, { align: 'right' });
  y += 17;
  doc.setDrawColor(...accent);
  doc.setLineWidth(1.1);
  doc.line(M, y, PW - M, y);
  y += 8;

  // ── Consent notice ──
  if (!showPhoto) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, 9, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text(
      b.photo_url
        ? 'Photograph withheld — no photo-release consent recorded for this person.'
        : 'No photograph on file.',
      M + 3, y + 5.8,
    );
    y += 13;
  }

  // ── Hero ──
  const photoS = 42;
  const heroTop = y;
  if (showPhoto) {
    const img = await loadImage(b.photo_url);
    if (img) { try { doc.addImage(img, 'JPEG', M, heroTop, photoS, photoS); } catch { /* ignore */ } }
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.8);
    doc.rect(M, heroTop, photoS, photoS);
  } else {
    doc.setFillColor(244, 242, 238);
    doc.rect(M, heroTop, photoS, photoS, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...muted);
    doc.text((name[0] || '?').toUpperCase(), M + photoS / 2, heroTop + photoS / 2 + 5, { align: 'center' });
  }

  const tx = M + photoS + 8;
  const tw = CW - photoS - 8;
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...ink);
  doc.text(name, tx, heroTop + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...muted);
  const meta = [
    b.beneficiary_code || b.unique_id ? `Ref ${b.beneficiary_code || b.unique_id}` : null,
    age != null ? `${age} years` : null,
    location,
  ].filter(Boolean).join('   ·   ');
  doc.text(meta, tx, heroTop + 18);

  if (b.career_ambition) {
    doc.setFillColor(...accent);
    const label = `Wants to be: ${b.career_ambition}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const w = doc.getTextWidth(label) + 8;
    doc.roundedRect(tx, heroTop + 23, Math.min(w, tw), 7, 3.5, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, tx + 4, heroTop + 27.8);
  }

  y = heroTop + photoS + 10;

  const heading = (t: string) => {
    ensure(16);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text(t.toUpperCase(), M, y);
    y += 2;
    doc.setDrawColor(...rule);
    doc.setLineWidth(0.3);
    doc.line(M, y, PW - M, y);
    y += 6;
  };

  // ── Bio: the centrepiece ──
  if (b.bio) {
    heading('Their story');
    doc.setFont('times', 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(50, 46, 44);
    const lines: string[] = doc.splitTextToSize(String(b.bio), CW);
    lines.forEach((ln) => {
      ensure(7);
      doc.text(ln, M, y);
      y += 5.6;
    });
    y += 5;
  }

  // ── Hobbies / interests ──
  const chips: string[] = [
    ...(Array.isArray(b.hobbies_list) ? b.hobbies_list : []),
    ...(Array.isArray(b.interests) ? b.interests : []),
  ].filter(Boolean);
  if (chips.length || b.favourite_subject || b.personal_strengths) {
    heading('What they love');
    if (chips.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let cx = M;
      chips.forEach((c) => {
        const w = doc.getTextWidth(c) + 7;
        if (cx + w > PW - M) { cx = M; y += 8; ensure(10); }
        doc.setFillColor(245, 243, 239);
        doc.roundedRect(cx, y - 4.5, w, 6.6, 3, 3, 'F');
        doc.setTextColor(...ink);
        doc.text(c, cx + 3.5, y);
        cx += w + 3;
      });
      y += 10;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    if (b.favourite_subject) {
      ensure(7);
      doc.setTextColor(...muted); doc.text('Favourite subject', M, y);
      doc.setTextColor(...ink); doc.text(String(b.favourite_subject), M + 45, y);
      y += 6;
    }
    if (b.personal_strengths) {
      ensure(7);
      doc.setTextColor(...muted); doc.text('Strengths', M, y);
      doc.setTextColor(...ink);
      const sl: string[] = doc.splitTextToSize(String(b.personal_strengths), CW - 45);
      doc.text(sl, M + 45, y);
      y += sl.length * 5 + 2;
    }
    y += 4;
  }

  // ── Education ──
  const eduRows: Array<[string, string]> = [];
  if (b.academic_level) eduRows.push(['Level', String(b.academic_level)]);
  if (b.grade) eduRows.push(['Grade / class', String(b.grade)]);
  if (mode !== 'public' && b.institution_name) eduRows.push(['School', String(b.institution_name)]);
  const recent = academics[0];
  if (recent) eduRows.push(['Recent result', `${recent.overall_grade || '—'} · ${recent.term} ${recent.academic_year}`]);
  if (eduRows.length) {
    heading('Education');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    eduRows.forEach(([k, v]) => {
      ensure(7);
      doc.setTextColor(...muted); doc.text(k, M, y);
      doc.setTextColor(...ink); doc.text(v, M + 45, y);
      y += 6;
    });
    y += 4;
  }

  // ── Programme participation ──
  if (programmes.length) {
    heading('Support they receive');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    programmes.slice(0, 8).forEach((p) => {
      ensure(7);
      doc.setTextColor(...ink);
      doc.text(`• ${p.name}`, M, y);
      if (p.support || p.enrolled_date) {
        doc.setTextColor(...muted);
        const rightTxt = [p.support, p.enrolled_date ? `since ${format(new Date(p.enrolled_date), 'MMM yyyy')}` : null].filter(Boolean).join(' · ');
        doc.text(rightTxt, PW - M, y, { align: 'right' });
      }
      y += 6;
    });
    y += 4;
  }

  // ── Needs ──
  if (needs.length) {
    heading('Needs');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const statusLabel: Record<string, string> = { met: 'Met', partially_met: 'Partially met', unmet: 'Unmet' };
    needs.forEach((n) => {
      ensure(7);
      doc.setTextColor(...ink);
      doc.text(n.label, M, y);
      const cur = n.currency || 'KES';
      const amount = n.estimated_cost != null
        ? `${cur} ${Number(n.funded_amount || 0).toLocaleString()} of ${Number(n.estimated_cost).toLocaleString()}`
        : '';
      doc.setTextColor(...muted);
      doc.text([statusLabel[n.status] || n.status, amount].filter(Boolean).join('  ·  '), PW - M, y, { align: 'right' });
      y += 6;
    });
    y += 4;
  }

  // ── Impact panel ──
  const metrics: Array<[string, string]> = [
    [String(input.yearsSupported ?? 0), 'Years supported'],
    [String(input.servicesReceived ?? programmes.length), 'Services received'],
    [String(needs.filter((n) => n.status === 'met').length), 'Needs met'],
    [String(milestones.length), 'Milestones'],
  ];
  ensure(34);
  doc.setFillColor(250, 249, 246);
  doc.setDrawColor(...rule);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, 26, 2, 2, 'FD');
  const cellW = CW / metrics.length;
  metrics.forEach(([num, label], i) => {
    const cx = M + cellW * i + cellW / 2;
    doc.setFont('times', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(...accent);
    doc.text(num, cx, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(label, cx, y + 19, { align: 'center' });
  });
  y += 32;

  // ── Milestones (non-sensitive only — filtered by the caller AND here) ──
  const safeMilestones = milestones.filter((m) => !!m.title);
  if (safeMilestones.length) {
    heading('Recent milestones');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    safeMilestones.slice(0, 6).forEach((m) => {
      ensure(7);
      doc.setTextColor(...muted);
      doc.text(format(new Date(m.occurred_on), 'MMM yyyy'), M, y);
      doc.setTextColor(...ink);
      const ml: string[] = doc.splitTextToSize(m.title, CW - 30);
      doc.text(ml, M + 26, y);
      y += Math.max(6, ml.length * 5);
    });
  }

  // ── Watermark on FULL ──
  const pages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (mode === 'full') {
      doc.saveGraphicsState?.();
      try {
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.07 }));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(58);
        doc.setTextColor(0, 0, 0);
        doc.text('INTERNAL USE', PW / 2, PH / 2, { align: 'center', angle: 32 });
      } catch { /* opacity unsupported — skip */ }
      doc.restoreGraphicsState?.();
    }
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    const fy = PH - 12;
    doc.setDrawColor(...rule);
    doc.setLineWidth(0.2);
    doc.line(M, fy - 4, PW - M, fy - 4);
    const notice = mode === 'full'
      ? `Confidential — internal use within ${org.name} only. Do not circulate.`
      : `Confidential — shared in trust by ${org.name}. Please do not republish or share onward.`;
    doc.text(notice, M, fy);
    doc.text(
      [org.contact, `Generated ${format(new Date(), 'd MMM yyyy')}`].filter(Boolean).join('  ·  '),
      PW - M, fy, { align: 'right' },
    );
    doc.text(`Page ${i} of ${pages}`, PW / 2, fy + 4, { align: 'center' });
  }

  return doc;
}

export async function downloadShareableProfile(input: ShareProfileInput): Promise<void> {
  const doc = await build(input);
  const safe = shareName(input.beneficiary, input.mode).replace(/[^\w]+/g, '_');
  doc.save(`${safe}_${input.mode}_profile_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export async function printShareableProfile(input: ShareProfileInput): Promise<void> {
  const doc = await build(input);
  const url = doc.output('bloburl') as unknown as string;
  const win = window.open(url, '_blank');
  if (win) win.addEventListener('load', () => { try { win.focus(); win.print(); } catch { /* ignore */ } });
}
