import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Loader2, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  projectId: string;
  projectName: string;
  organizationId: string;
  enrolledCount: number;
}

type Fmt = "csv" | "xlsx" | "pdf";

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return a;
}

function slugify(s: string) {
  return (s || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "project";
}

function displayName(b: any, consent: boolean): string {
  const first = (b.first_name || "").trim();
  const last = (b.last_name || "").trim();
  if (consent) {
    return b.display_name || `${first} ${last}`.trim() || "—";
  }
  // Redact surname when consent is not on file
  const redactedLast = last ? `${last.charAt(0)}.` : "";
  return `${first} ${redactedLast}`.trim() || "—";
}

function sponsorshipLabel(required: number, received: number): string {
  if (!required || required <= 0) return "N/A";
  if (received <= 0) return "Unsponsored";
  if (received >= required) return "Sponsored";
  return "Partially sponsored";
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function ProjectBeneficiariesExport({ projectId, projectName, organizationId, enrolledCount }: Props) {
  const [busy, setBusy] = useState<Fmt | null>(null);
  const [open, setOpen] = useState(false);

  const buildRows = async () => {
    // Org-scoped, project-scoped, active enrollments only. Reuse the
    // same filter shape as the tab so the export always matches the UI.
    const { data: enrollments, error: enrollErr } = await supabase
      .from("beneficiary_services")
      .select(
        `enrolled_date, status, beneficiary_id,
         beneficiary:beneficiaries!inner(
           id, beneficiary_code, unique_id, first_name, last_name, display_name, gender,
           date_of_birth, county, sub_county, status, consent_given,
           vulnerability_level, care_arrangement, funding_required
         )`
      )
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .eq("beneficiary.organization_id", organizationId)
      .is("beneficiary.deleted_at", null)
      .ilike("status", "active");

    if (enrollErr) throw enrollErr;

    const rowsRaw = (enrollments || [])
      .map((e: any) => ({ enrolled_date: e.enrolled_date, enroll_status: e.status, ...(e.beneficiary || {}) }))
      .filter((r: any) => r.id);

    // Dedup by beneficiary id (in case of legacy duplicate rows)
    const seen = new Set<string>();
    const rows = rowsRaw.filter((r: any) => (seen.has(r.id) ? false : (seen.add(r.id), true)));

    // Fetch sponsorship totals (amount_received) per beneficiary
    const ids = rows.map((r: any) => r.id);
    let receivedByBen = new Map<string, number>();
    if (ids.length) {
      const { data: donors, error: dErr } = await supabase
        .from("beneficiary_donors")
        .select("beneficiary_id, amount_received")
        .in("beneficiary_id", ids);
      if (dErr) throw dErr;
      (donors || []).forEach((d: any) => {
        receivedByBen.set(
          d.beneficiary_id,
          (receivedByBen.get(d.beneficiary_id) || 0) + Number(d.amount_received || 0),
        );
      });
    }

    return rows.map((b: any) => {
      const consent = !!b.consent_given;
      const age = ageFromDob(b.date_of_birth);
      return {
        "Beneficiary ID": b.beneficiary_code || b.unique_id || "—",
        "Full Name": displayName(b, consent),
        Gender: b.gender || "—",
        Age: age ?? "—",
        "Date of Birth": b.date_of_birth || "—",
        County: b.county || "—",
        "Sub-County": b.sub_county || "—",
        "Enrollment Date": b.enrolled_date || "—",
        Status: b.status || "—",
        "Care Arrangement": b.care_arrangement || "—",
        "Sponsorship Status": sponsorshipLabel(Number(b.funding_required || 0), receivedByBen.get(b.id) || 0),
        "Vulnerability Level": b.vulnerability_level || "—",
      };
    });
  };

  const baseFilename = () =>
    `apexos-${slugify(projectName)}-beneficiaries-${format(new Date(), "yyyy-MM-dd")}`;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toCsv = (rows: Record<string, any>[]) => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const esc = (v: any) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  };

  const doExport = async (fmt: Fmt) => {
    setBusy(fmt);
    setOpen(false);
    try {
      const rows = await buildRows();
      if (rows.length === 0) {
        toast.error("No enrolled beneficiaries to export");
        return;
      }
      const name = baseFilename();

      if (fmt === "csv") {
        const csv = toCsv(rows);
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${name}.csv`);
      } else if (fmt === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
        // Force the Beneficiary ID column to text so codes like "HTH-26-007" don't get mangled.
        const range = XLSX.utils.decode_range(ws["!ref"] as string);
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          const addr = XLSX.utils.encode_cell({ c: 0, r: R });
          const cell = ws[addr];
          if (cell) { cell.t = "s"; cell.z = "@"; }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Beneficiaries");
        XLSX.writeFile(wb, `${name}.xlsx`);
      } else {
        // PDF
        const { data: org } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", organizationId)
          .maybeSingle();
        const orgName = org?.name || "";
        const logoData = org?.logo_url ? await loadImageAsDataUrl(org.logo_url) : null;

        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        let headerY = 12;
        if (logoData) {
          try {
            pdf.addImage(logoData, "PNG", 10, 8, 16, 16);
          } catch {
            /* ignore invalid image */
          }
        }
        pdf.setFontSize(11);
        pdf.setTextColor(30);
        pdf.text(orgName, logoData ? 30 : 10, headerY + 2);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Enrolled Beneficiaries — ${projectName}`, logoData ? 30 : 10, headerY + 9);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(110);
        pdf.text(
          `Generated ${format(new Date(), "PPpp")} · ${rows.length} beneficiary${rows.length === 1 ? "" : "ies"}`,
          logoData ? 30 : 10,
          headerY + 14,
        );

        const headers = Object.keys(rows[0]);
        autoTable(pdf, {
          startY: headerY + 20,
          head: [headers],
          body: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
          styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
          headStyles: { fillColor: [15, 123, 108], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [246, 247, 251] },
          margin: { left: 8, right: 8, bottom: 14 },
          didDrawPage: () => {
            pdf.setFontSize(7);
            pdf.setTextColor(130);
            pdf.text(
              "CONFIDENTIAL — For authorised use only. Handle in line with data protection & child safeguarding policy.",
              pageW / 2,
              pageH - 6,
              { align: "center" },
            );
          },
        });

        pdf.save(`${name}.pdf`);
      }

      toast.success(`Exported ${rows.length} beneficiary${rows.length === 1 ? "" : "ies"}`);
    } catch (err: any) {
      console.error("Export failed", err);
      toast.error(err?.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const disabled = enrolledCount === 0;

  const button = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || !!busy}
      className="gap-1.5"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export
    </Button>
  );

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>No enrolled beneficiaries to export</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        <button
          onClick={() => doExport("csv")}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          CSV <span className="ml-auto text-[10px] text-muted-foreground">default</span>
        </button>
        <button
          onClick={() => doExport("xlsx")}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
        >
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          Excel (.xlsx)
        </button>
        <button
          onClick={() => doExport("pdf")}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
        >
          <FileType className="h-4 w-4 text-muted-foreground" />
          PDF roster
        </button>
      </PopoverContent>
    </Popover>
  );
}