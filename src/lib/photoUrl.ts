import { supabase } from '@/integrations/supabase/client';

export const PHOTO_BUCKET = 'beneficiary-photos';

/** Buckets whose objects are private and must be read through signed URLs. */
const PRIVATE_BUCKETS = ['beneficiary-photos', 'child-photos', 'beneficiary-documents'];

/**
 * Values stored in `photo_url` come in three historical shapes:
 *  1. a bare storage path        -> "<orgId>/<beneficiaryId>-123.jpg"
 *  2. a legacy PUBLIC storage URL -> ".../storage/v1/object/public/beneficiary-photos/<path>"
 *  3. an external image URL       -> "https://example.com/photo.jpg"
 *
 * (1) and (2) live in a PRIVATE bucket and need a short-lived signed URL.
 * (3) is used as-is; it is never proxied.
 */
export function parsePhotoRef(
  value: string | null | undefined
): { kind: 'storage'; bucket: string; path: string } | { kind: 'external'; url: string } | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  if (!/^https?:\/\//i.test(v)) {
    // Bare storage path. May optionally be prefixed with "<bucket>:".
    const [maybeBucket, ...rest] = v.split(':');
    if (rest.length && PRIVATE_BUCKETS.includes(maybeBucket)) {
      return { kind: 'storage', bucket: maybeBucket, path: rest.join(':') };
    }
    return { kind: 'storage', bucket: PHOTO_BUCKET, path: v.replace(/^\/+/, '') };
  }

  const m = v.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/i);
  if (m) {
    const [, bucket, path] = m;
    if (PRIVATE_BUCKETS.includes(bucket)) {
      return { kind: 'storage', bucket, path: decodeURIComponent(path) };
    }
    return { kind: 'external', url: v };
  }

  return { kind: 'external', url: v };
}

/** True when the string looks like a usable absolute image URL. */
export function isValidExternalImageUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const cache = new Map<string, { url: string; expires: number }>();

/** Resolve any stored photo reference to a renderable src (signed when private). */
export async function resolvePhotoSrc(
  value: string | null | undefined,
  ttlSeconds = 3600
): Promise<string | null> {
  const ref = parsePhotoRef(value);
  if (!ref) return null;
  if (ref.kind === 'external') return ref.url;

  const cacheKey = `${ref.bucket}/${ref.path}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.url;

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, ttlSeconds);
  if (error || !data?.signedUrl) return null;

  cache.set(cacheKey, { url: data.signedUrl, expires: Date.now() + (ttlSeconds - 60) * 1000 });
  return data.signedUrl;
}

/** Batch variant used by lists so one render doesn't fire N round-trips serially. */
export async function resolvePhotoSrcMany(
  values: (string | null | undefined)[],
  ttlSeconds = 3600
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const unique = Array.from(new Set(values.filter(Boolean) as string[]));
  await Promise.all(
    unique.map(async (v) => {
      const src = await resolvePhotoSrc(v, ttlSeconds);
      if (src) out[v] = src;
    })
  );
  return out;
}

export function initialsFrom(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}
