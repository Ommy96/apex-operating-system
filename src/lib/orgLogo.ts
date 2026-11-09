// org-logos is the only public bucket (logos appear on public pages).
// Only raster image types are accepted — no SVG (can carry script), no documents/photos of people.
export const ORG_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ORG_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const ORG_LOGO_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function orgLogoRejection(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  if (!(ORG_LOGO_MIME_TYPES as readonly string[]).includes(type)) return "Logo must be a PNG, JPEG or WebP image";
  if (file.size > ORG_LOGO_MAX_BYTES) return "File too large — max 2MB";
  return null;
}
