import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportElementToPdf, exportToCsv } from "@/lib/analyticsExport";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface Props {
  targetRef: React.RefObject<HTMLElement>;
  rows: Array<Record<string, unknown>>;
  baseName: string;
}

export function ExportPopover({ targetRef, rows, baseName }: Props) {
  const exportPng = async () => {
    if (!targetRef.current) return;
    const canvas = await html2canvas(targetRef.current, { scale: 2, backgroundColor: "#ffffff" });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${baseName}.png`; a.click();
      URL.revokeObjectURL(url);
      toast.success("PNG exported");
    });
  };
  const exportCsv = () => { exportToCsv(rows, baseName); toast.success("CSV exported"); };
  const exportPdf = async () => {
    if (!targetRef.current) return;
    await exportElementToPdf(targetRef.current, baseName); toast.success("PDF exported");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={exportPng}>PNG image</button>
        <button className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={exportCsv}>CSV data</button>
        <button className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={exportPdf}>PDF report</button>
      </PopoverContent>
    </Popover>
  );
}