import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  activityId: string;
  activityTitle: string;
  activityDate: string;
  location?: string;
  facilitator?: string;
}

export function PrintableAttendanceRegister({ activityId, activityTitle, activityDate, location, facilitator }: Props) {
  const { currentOrganization } = useOrganization();
  const { orgName } = useBranding();

  const { data: attendees = [] } = useQuery({
    queryKey: ["attendance-register", activityId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("activity_participants")
        .select("attended, notes, beneficiaries(display_name)")
        .eq("activity_id", activityId);
      return data || [];
    },
    enabled: !!activityId,
  });

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = attendees.map((a: any, i: number) =>
      `<tr><td>${i + 1}</td><td>${(a.beneficiaries as any)?.display_name || "—"}</td><td></td><td></td><td>${a.notes || ""}</td></tr>`
    ).join("");

    // Add 5 blank rows
    const blankRows = Array.from({ length: 5 }, (_, i) =>
      `<tr><td>${attendees.length + i + 1}</td><td></td><td></td><td></td><td></td></tr>`
    ).join("");

    printWindow.document.write(`
      <html><head><title>Attendance Register</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; font-weight: normal; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
        th { background: #f0f0f0; font-size: 11px; }
        td { min-height: 24px; }
        .meta { margin-top: 8px; font-size: 11px; color: #555; }
        .footer { position: fixed; bottom: 10px; width: 100%; text-align: center; font-size: 9px; color: #999; }
        @media print { .no-print { display: none !important; } }
      </style></head><body>
      <h1>${orgName} — Attendance Register</h1>
      <h2>${activityTitle}</h2>
      <div class="meta">
        <p><strong>Date:</strong> ${activityDate} &nbsp; <strong>Location:</strong> ${location || "—"} &nbsp; <strong>Facilitator:</strong> ${facilitator || "—"}</p>
      </div>
      <table>
        <thead><tr><th>#</th><th>Full Name</th><th>ID Number</th><th>Signature</th><th>Notes</th></tr></thead>
        <tbody>${rows}${blankRows}</tbody>
      </table>
      <div class="footer">Printed on ${new Date().toLocaleDateString("en-KE")} — CONFIDENTIAL</div>
      <script>window.print(); window.onafterprint = () => window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="no-print gap-1">
      <Printer className="h-4 w-4" /> Print Register
    </Button>
  );
}
