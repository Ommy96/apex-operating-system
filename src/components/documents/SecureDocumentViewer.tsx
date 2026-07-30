import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileText, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  createSignedDocumentUrl,
  logDocumentAccess,
  previewKind,
} from "@/lib/secureDocuments";

export interface SecureDocument {
  id: string;
  name: string;
  /** value stored in the DB (storage path, or legacy full URL) */
  fileUrl: string;
  bucket: string;
  mimeType?: string | null;
  organizationId?: string | null;
}

interface Props {
  document: SecureDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** blocked=true renders a consent notice instead of the file */
  blockedReason?: string | null;
}

export function SecureDocumentViewer({
  document: doc,
  open,
  onOpenChange,
  blockedReason,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!open || !doc || blockedReason) {
      setUrl(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      const { url: signed, error: err } = await createSignedDocumentUrl(
        doc.bucket,
        doc.fileUrl
      );
      if (cancelled) return;
      setUrl(signed);
      setError(err);
      setLoading(false);
      if (signed) {
        void logDocumentAccess({
          documentId: doc.id,
          organizationId: doc.organizationId,
          action: "view",
          metadata: { bucket: doc.bucket, name: doc.name },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, doc?.id, doc?.fileUrl, blockedReason]);

  const handleDownload = async () => {
    if (!doc) return;
    const { url: signed, error: err } = await createSignedDocumentUrl(
      doc.bucket,
      doc.fileUrl,
      { download: doc.name }
    );
    if (err || !signed) {
      toast.error(err || "Could not generate a download link");
      return;
    }
    void logDocumentAccess({
      documentId: doc.id,
      organizationId: doc.organizationId,
      action: "download",
      metadata: { bucket: doc.bucket, name: doc.name },
    });
    window.open(signed, "_blank", "noopener");
  };

  const kind = doc ? previewKind(doc.name, doc.mimeType) : "other";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,60rem)] max-h-[92dvh] h-full sm:h-auto flex flex-col gap-4 overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle className="truncate pr-8">{doc?.name}</DialogTitle>
          <DialogDescription>
            Access is logged and the link expires in a few minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-[40dvh] overflow-auto rounded-lg border bg-muted/30">
          {blockedReason ? (
            <div className="p-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{blockedReason}</AlertDescription>
              </Alert>
            </div>
          ) : loading ? (
            <div className="h-full min-h-[40dvh] grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : url && kind === "image" ? (
            <img
              src={url}
              alt={doc?.name}
              className="mx-auto max-h-[70dvh] w-auto max-w-full object-contain"
            />
          ) : url && kind === "pdf" ? (
            <iframe
              src={url}
              title={doc?.name}
              className="w-full h-[70dvh] border-0 bg-background"
            />
          ) : (
            <div className="h-full min-h-[40dvh] grid place-items-center text-center p-6">
              <div className="space-y-3">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This file type cannot be previewed in the browser.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {!blockedReason && (
            <Button className="min-h-[44px]" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" /> Download
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}