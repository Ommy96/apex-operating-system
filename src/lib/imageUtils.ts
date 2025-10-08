export const convertGoogleDriveUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    const u = new URL(trimmed);

    // Only handle Google Drive links specially
    if (u.hostname.includes("drive.google.com")) {
      // Case: /file/d/FILE_ID/...
      const fileMatch = u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch?.[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
      }

      // Case: existing direct format /uc?id=...
      if (u.pathname.includes('/uc')) {
        if (!u.searchParams.get('id')) {
          // If no id, just ensure export=view and return
          u.searchParams.set('export', 'view');
          return u.toString();
        }
        u.searchParams.set('export', 'view');
        return u.toString();
      }

      // Case: ?id=FILE_ID
      const idParam = u.searchParams.get('id');
      if (idParam) {
        return `https://drive.google.com/uc?export=view&id=${idParam}`;
      }

      // Case: /thumbnail?id=FILE_ID
      if (u.pathname.includes('/thumbnail')) {
        const thumbId = u.searchParams.get('id');
        if (thumbId) return `https://drive.google.com/uc?export=view&id=${thumbId}`;
      }
    }
  } catch {
    // Not a valid absolute URL; fall back to regex matching
    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch?.[1]) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
    const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParam?.[1]) return `https://drive.google.com/uc?export=view&id=${idParam[1]}`;
    const thumbMatch = trimmed.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/);
    if (thumbMatch?.[1]) return `https://drive.google.com/uc?export=view&id=${thumbMatch[1]}`;
  }

  // Non-Drive or already direct links: return as-is
  return trimmed;
};