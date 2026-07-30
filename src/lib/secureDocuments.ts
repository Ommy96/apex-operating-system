import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Secure document access helpers.
 *
 * All document buckets are PRIVATE. Reads must go through short-lived signed
 * URLs generated for the authenticated user; the storage RLS policies scope
 * every object by the organization id in the first path segment.
 */
export const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

/**
 * Build the canonical, org-scoped object path for a beneficiary document.
 */
export function beneficiaryDocumentPath(
  orgId: string,
  beneficiaryId: string,
  fileName: string
) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${orgId}/${beneficiaryId}/${Date.now()}-${safe}`;
}

/**
 * Normalises whatever is stored in `file_url` into a storage object path.
 * Historic rows may hold a full (public) URL or a `placeholder://` value.
 */
export function toStoragePath(fileUrl: string, bucket: string): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("placeholder://")) return null;
  // Full Supabase URL -> take everything after /<bucket>/
  const marker = `/${bucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(fileUrl.slice(idx + marker.length).split("?")[0]);
  }
  if (/^https?:\/\//i.test(fileUrl)) return null;
  return fileUrl.replace(/^\/+/, "");
}

export async function createSignedDocumentUrl(
  bucket: string,
  fileUrl: string,
  opts?: { download?: string; expiresIn?: number }
): Promise<{ url: string | null; error: string | null }> {
  const path = toStoragePath(fileUrl, bucket);
  if (!path) {
    return {
      url: null,
      error:
        "This document has no stored file. It was recorded before file storage was configured — please re-upload it.",
    };
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, opts?.expiresIn ?? SIGNED_URL_TTL_SECONDS, {
      download: opts?.download,
    });
  if (error) {
    logger.error("createSignedUrl failed", error);
    return { url: null, error: error.message };
  }
  return { url: data?.signedUrl ?? null, error: null };
}

/**
 * Records who viewed/downloaded which document. Important for child-data
 * accountability. Never blocks the user-facing action.
 */
export async function logDocumentAccess(params: {
  documentId: string;
  organizationId?: string | null;
  action: "view" | "download";
  metadata?: Record<string, unknown>;
}) {
  if (!params.organizationId) return;
  const { error } = await supabase.from("document_access_logs").insert({
    document_id: params.documentId,
    organization_id: params.organizationId,
    user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
    action: params.action,
    metadata: (params.metadata ?? {}) as any,
  });
  if (error) logger.warn("document access log failed", error);
}

export type PreviewKind = "image" | "pdf" | "other";

export function previewKind(name: string, mime?: string | null): PreviewKind {
  const lower = (name || "").toLowerCase();
  if (mime?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|bmp)$/.test(lower))
    return "image";
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  return "other";
}