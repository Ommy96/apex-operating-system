import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { resolvePhotoSrc, initialsFrom } from '@/lib/photoUrl';

interface Props {
  photoUrl?: string | null;
  name?: string | null;
  /** When false the photo is suppressed entirely (no photo-release consent). */
  consentGiven?: boolean;
  className?: string;
  /** Tailwind size classes, e.g. "h-10 w-10". */
  size?: string;
}

/**
 * Renders a beneficiary photograph from a PRIVATE storage bucket via a short-lived
 * signed URL, or from an external URL, falling back to initials. Photos are omitted
 * outright when photo-release consent is absent.
 */
export function BeneficiaryAvatar({
  photoUrl,
  name,
  consentGiven = true,
  className,
  size = 'h-10 w-10',
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    if (!photoUrl || !consentGiven) return;
    resolvePhotoSrc(photoUrl)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [photoUrl, consentGiven]);

  const showImage = !!src && !failed;

  return (
    <div
      className={cn(
        size,
        'rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border',
        className
      )}
    >
      {showImage ? (
        <img
          src={src!}
          alt={name ? `Photograph of ${name}` : 'Beneficiary photograph'}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground select-none">
          {initialsFrom(name)}
        </span>
      )}
    </div>
  );
}
