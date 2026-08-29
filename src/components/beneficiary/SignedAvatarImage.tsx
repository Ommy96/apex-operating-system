import { useEffect, useState } from 'react';
import { AvatarImage } from '@/components/ui/avatar';
import { resolvePhotoSrc } from '@/lib/photoUrl';

interface Props {
  photoUrl?: string | null;
  alt?: string;
  /** When false the photo is suppressed (no photo-release consent on file). */
  allowed?: boolean;
}

/**
 * Drop-in replacement for <AvatarImage src={photo_url} /> that resolves private
 * storage paths to short-lived signed URLs and silently falls through to the
 * <AvatarFallback> when there is no photo, no consent, or the image fails to load.
 */
export function SignedAvatarImage({ photoUrl, alt = '', allowed = true }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    if (!photoUrl || !allowed) return;
    resolvePhotoSrc(photoUrl)
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [photoUrl, allowed]);

  if (!src || failed) return null;
  return <AvatarImage src={src} alt={alt} onError={() => setFailed(true)} />;
}

/** Same resolution logic for a plain <img> (profile hero, PDF preview, etc.). */
export function useSignedPhoto(photoUrl?: string | null, allowed = true) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!photoUrl || !allowed) return;
    resolvePhotoSrc(photoUrl)
      .then((url) => !cancelled && setSrc(url))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [photoUrl, allowed]);

  return src;
}
