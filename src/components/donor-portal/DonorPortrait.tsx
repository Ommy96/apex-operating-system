import { useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { resolvePhotoSrc } from '@/lib/photoUrl';
import { DONOR_IMAGE_TTL_SECONDS } from '@/lib/donorProfile';
import { cn } from '@/lib/utils';

/** Signs a private photo (300s) only once the element is in the viewport. */
export function useInViewSignedPhoto(path: string | null | undefined, allowed: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    let cancelled = false;
    setSrc(null); setFailed(false);
    if (!inView || !allowed || !path) return;
    resolvePhotoSrc(path, DONOR_IMAGE_TTL_SECONDS)
      .then((url) => { if (!cancelled) { if (url) setSrc(url); else setFailed(true); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [inView, allowed, path]);

  return { ref, src: failed ? null : src, failed, markFailed: () => setFailed(true) };
}

interface Props {
  photoPath: string | null | undefined;
  consented: boolean;
  name?: string | null;
  showReleaseBadge?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * 4:5 portrait. Without consent (or when signing fails) it renders a neutral
 * panel — never initials, which would leak the withheld name.
 */
export function DonorPortrait({ photoPath, consented, name, showReleaseBadge, compact, className }: Props) {
  const { ref, src, markFailed } = useInViewSignedPhoto(photoPath, consented);
  const showPhoto = consented && !!src;
  return (
    <div ref={ref} className={cn('relative aspect-[4/5] w-full overflow-hidden rounded-[20px]', className)}>
      {showPhoto ? (
        <img
          src={src!}
          alt={name || 'Sponsored participant'}
          onError={markFailed}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-border bg-donor-inset p-4 text-center">
          <UserRound aria-hidden="true" className={compact ? 'h-10 w-10 text-muted-foreground' : 'h-16 w-16 text-muted-foreground'} />
          {consented ? (
            <p className="text-xs text-muted-foreground">Photo not available right now.</p>
          ) : (
            <>
              <span className="sr-only">Photo withheld — no release on file</span>
              {!compact && (
                <p className="max-w-[16rem] text-sm text-donor-secondary">
                  No photo release is on file, so we are not showing a picture.
                </p>
              )}
            </>
          )}
        </div>
      )}
      {showPhoto && showReleaseBadge && (
        <span className="absolute bottom-3 left-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-semibold tracking-wider text-donor-link">
          PHOTO RELEASE ON FILE
        </span>
      )}
    </div>
  );
}
