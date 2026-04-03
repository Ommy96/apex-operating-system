import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { FileDown, RefreshCw, Save, Send, Loader2 } from "lucide-react";
import { GrantFinancialReport } from "./GrantFinancialReport";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface DonorProgressReportProps {
  projectId: string;
  grantId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
}

export function DonorProgressReport({ projectId, grantId, reportingPeriodStart, reportingPeriodEnd }: DonorProgressReportProps) {
  const { currentOrganization } = useOrganization();
  const orgName = (currentOrganization as any)?.organization_name || "Organization";
  const [challenges, setChallenges] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const project = useQuery({
    queryKey: ["donor-report-project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*, program:programs(name)").eq("id", projectId).single();
      return data;
    },
    enabled: !!projectId,
  });

  const beneficiaries = useQuery({
    queryKey: ["donor-report-beneficiaries", projectId, reportingPeriodStart, reportingPeriodEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("beneficiary_services")
        .select("beneficiary_id, enrolled_date, beneficiary:beneficiaries(gender, display_name)")
        .eq("project_id", projectId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!projectId,
  });

  const activities = useQuery({
    queryKey: ["donor-report-activities", projectId, reportingPeriodStart, reportingPeriodEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, title, actual_date, location, status")
        .eq("project_id", projectId)
        .gte("actual_date", reportingPeriodStart)
        .lte("actual_date", reportingPeriodEnd)
        .eq("status", "completed");
      return data || [];
    },
    enabled: !!projectId,
  });

  const attendance = useQuery({
    queryKey: ["donor-report-attendance", activities.data?.map((a: any) => a.id)],
    queryFn: async () => {
      const ids = (activities.data || []).map((a: any) => a.id);
      if (ids.length === 0) return {};
      const { data } = await supabase.from("activity_attendance").select("activity_id").in("activity_id", ids);
      const counts: Record<string, number> = {};
      (data || []).forEach((a: any) => { counts[a.activity_id] = (counts[a.activity_id] || 0) + 1; });
      return counts;
    },
    enabled: (activities.data || []).length > 0,
  });

  const allActivitiesCount = useQuery({
    queryKey: ["donor-report-all-activities", projectId, reportingPeriodStart, reportingPeriodEnd],
    queryFn: async () => {
      const { count } = await supabase.from("activities").select("id", { count: "exact", head: true }).eq("project_id", projectId).gte("planned_start_date", reportingPeriodStart).lte("planned_start_date", reportingPeriodEnd);
      return count || 0;
    },
    enabled: !!projectId,
  });

  const bens = beneficiaries.data || [];
  const totalBeneficiaries = bens.length;
  const maleCount = bens.filter((b: any) => b.beneficiary?.gender === "Male").length;
  const femaleCount = bens.filter((b: any) => b.beneficiary?.gender === "Female").length;
  const completedActivities = (activities.data || []).length;
  const totalPlanned = allActivitiesCount.data || 0;

  const executiveSummary = `During ${reportingPeriodStart} to ${reportingPeriodEnd}, ${orgName} implemented ${project.data?.name || "the project"} reaching ${totalBeneficiaries} beneficiaries (${maleCount} male, ${femaleCount} female). ${completedActivities} of ${totalPlanned} planned activities were completed.`;

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 10;
      pdf.setFontSize(8);
      pdf.setTextColor(100);

      if (imgH <= pdfH - 30) {
        pdf.addImage(imgData, "PNG", 10, y, imgW, imgH);
        pdf.text("CONFIDENTIAL", pdfW / 2, pdfH - 8, { align: "center" });
        pdf.text(`Page 1`, pdfW - 15, pdfH - 8);
      } else {
        let pageNum = 1;
        let srcY = 0;
        while (srcY < canvas.height) {
          const sliceH = Math.min(canvas.height - srcY, (canvas.width * (pdfH - 30)) / imgW);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          sliceCanvas.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceImg = sliceCanvas.toDataURL("image/png");
          if (pageNum > 1) pdf.addPage();
          const renderedH = (sliceH * imgW) / canvas.width;
          pdf.addImage(sliceImg, "PNG", 10, 10, imgW, renderedH);
          pdf.text("CONFIDENTIAL", pdfW / 2, pdfH - 8, { align: "center" });
          pdf.text(`Page ${pageNum}`, pdfW - 15, pdfH - 8);
          srcY += sliceH;
          pageNum++;
        }
      }
      pdf.save(`progress-report-${reportingPeriodStart}.pdf`);
      toast.success("PDF exported");
    } catch (err) {
      toast.error("PDF export failed");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSaveDraft = async () => {
    const { error } = await supabase.from("grant_reports").upsert({
      grant_id: grantId,
      report_title: `Progress Report ${reportingPeriodStart} to ${reportingPeriodEnd}`,
      report_type: "narrative",
      due_date: reportingPeriodEnd,
      reporting_period_start: reportingPeriodStart,
      reporting_period_end: reportingPeriodEnd,
      status: "draft",
      notes: JSON.stringify({ challenges, nextSteps, generated_at: new Date().toISOString() }),
    }, { onConflict: "id" });
    if (error) toast.error(error.message);
    else toast.success("Draft saved");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleSaveDraft}><Save className="h-4 w-4 mr-1" /> Save Draft</Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf}>
          {exportingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />} Export PDF
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6 bg-background p-6 rounded-lg border">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">{orgName}</h2>
          <h3 className="text-lg font-semibold text-foreground">{project.data?.name} — Progress Report</h3>
          <p className="text-sm text-muted-foreground">Period: {reportingPeriodStart} to {reportingPeriodEnd}</p>
        </div>
        <Separator />

        <Card>
          <CardHeader><CardTitle className="text-base">1. Executive Summary</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{executiveSummary}</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">3. Beneficiaries Reached</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div><p className="text-2xl font-bold text-foreground">{totalBeneficiaries}</p><p className="text-muted-foreground">Total</p></div>
              <div><p className="text-2xl font-bold text-foreground">{maleCount}</p><p className="text-muted-foreground">Male</p></div>
              <div><p className="text-2xl font-bold text-foreground">{femaleCount}</p><p className="text-muted-foreground">Female</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">4. Activities Completed</CardTitle></CardHeader>
          <CardContent>
            {(activities.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed activities in this period.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Activity</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Attendance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(activities.data || []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.title}</TableCell>
                      <TableCell className="text-sm">{a.actual_date ? new Date(a.actual_date).toLocaleDateString("en-KE") : "—"}</TableCell>
                      <TableCell className="text-sm">{a.location || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{(attendance.data as any)?.[a.id] || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">5. Financial Summary</CardTitle></CardHeader>
          <CardContent>
            <GrantFinancialReport grantId={grantId} reportingPeriodStart={reportingPeriodStart} reportingPeriodEnd={reportingPeriodEnd} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">6. Challenges</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={challenges} onChange={e => setChallenges(e.target.value)} placeholder="Describe challenges encountered..." rows={4} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">7. Next Steps</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={nextSteps} onChange={e => setNextSteps(e.target.value)} placeholder="Outline planned next steps..." rows={4} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
