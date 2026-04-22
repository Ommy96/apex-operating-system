import { useState } from "react";
import { Download, FileText, FileSpreadsheet, FileImage, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import {
  exportElementToPdf,
  exportToCsv,
  exportToXlsx,
} from "@/lib/analyticsExport";

interface Props {
  /** Element to capture for the PDF snapshot (usually the tab container). */
  captureRef: React.RefObject<HTMLElement>;
  /** Active tab label, used in the file name. */
  tabLabel: string;
  /** Optional: rows to export as CSV/XLSX. When empty, only PDF is offered. */
  csvRows?: Record<string, unknown>[];
  xlsxSheets?: Record<string, Record<string, unknown>[]>;
}

export function AnalyticsExportMenu({ captureRef, tabLabel, csvRows, xlsxSheets }: Props) {
  const [busy, setBusy] = useState(false);

  const baseName = `analytics-${tabLabel}`;

  const handlePdf = async () => {
    if (!captureRef.current) return;
    setBusy(true);
    try {
      await exportElementToPdf(captureRef.current, baseName);
      toast({ title: "PDF exported", description: `${tabLabel} snapshot saved.` });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Unable to render PDF.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCsv = () => {
    if (!csvRows?.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    exportToCsv(csvRows, baseName);
    toast({ title: "CSV exported" });
  };

  const handleXlsx = () => {
    const sheets = xlsxSheets ?? (csvRows ? { Data: csvRows } : null);
    if (!sheets || Object.keys(sheets).length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    exportToXlsx(sheets, baseName);
    toast({ title: "Excel file exported" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="text-xs">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Export “{tabLabel}”</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePdf} disabled={busy}>
          <FileImage className="mr-2 h-4 w-4" />
          PDF snapshot
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCsv} disabled={busy || !csvRows?.length}>
          <FileText className="mr-2 h-4 w-4" />
          CSV (data)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleXlsx} disabled={busy}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel workbook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}