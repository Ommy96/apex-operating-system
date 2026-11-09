import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateAnalyticsFile } from "@/lib/analyticsExport";
import { toast } from "sonner";
import { useState } from 'react';
import type { AnalyticsReport } from '@/lib/analyticsReport';
import { deliverFile } from '@/lib/fileDelivery';
import { Progress } from '@/components/ui/progress';

interface Props {
  getReport: () => Promise<AnalyticsReport>;
  disabled?: boolean;
  baseName: string;
}

export function ExportPopover({ getReport, baseName, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState<{ blob: Blob; filename: string } | null>(null);
  const prepare = async (format: 'pdf' | 'xlsx' | 'csv') => {
    setBusy(true); setProgress(1); setReady(null); toast.info('Preparing report…');
    try {
      const report = await getReport();
      const blob = await generateAnalyticsFile(report, format, setProgress);
      setReady({ blob, filename: `${baseName}-${report.timestamp.slice(0,10)}.${format}` });
      toast.success('Report ready to download');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Export failed'); }
    finally { setBusy(false); }
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" disabled={disabled}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2 space-y-1">
        <Button variant="ghost" className="w-full justify-start" disabled={busy} onClick={() => prepare('pdf')}>PDF report</Button>
        <Button variant="ghost" className="w-full justify-start" disabled={busy} onClick={() => prepare('xlsx')}>Excel workbook</Button>
        <Button variant="ghost" className="w-full justify-start" disabled={busy} onClick={() => prepare('csv')}>CSV data</Button>
        {busy && <div role="status" className="space-y-2 px-2 py-2"><Progress value={progress} /><span className="text-xs">Preparing · {progress}%</span></div>}
        {ready && <Button className="w-full" onClick={() => deliverFile(ready.blob, ready.filename)}><Download className="h-4 w-4 mr-2" />Download</Button>}
      </PopoverContent>
    </Popover>
  );
}