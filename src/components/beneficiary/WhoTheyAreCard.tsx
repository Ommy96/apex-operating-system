import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, BookOpen } from 'lucide-react';
import { SignedAvatarImage } from '@/components/beneficiary/SignedAvatarImage';

interface Props {
  beneficiary: any;
  /** Photo is only rendered when consent is on file. */
  photoAllowed?: boolean;
  onOpenBio?: () => void;
}

export function WhoTheyAreCard({ beneficiary: b, photoAllowed = true, onOpenBio }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hobbies: string[] = Array.isArray(b?.hobbies_list) ? b.hobbies_list : [];
  const interests: string[] = Array.isArray(b?.interests) ? b.interests : [];
  const chips = [...hobbies, ...interests];
  const bio: string = b?.bio || '';
  const hasAnything = bio || chips.length || b?.career_ambition;

  const initials = String(b?.display_name || b?.first_name || '?')
    .split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();

  const excerpt = bio.length > 220 ? `${bio.slice(0, 220).trimEnd()}…` : bio;

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] to-transparent">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 ring-2 ring-primary/20">
            <SignedAvatarImage photoUrl={b?.photo_url} allowed={!!photoAllowed} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Who they are
            </div>

            {b?.career_ambition && (
              <p className="text-sm sm:text-base font-semibold text-foreground break-words">
                <Target className="inline h-4 w-4 mr-1 text-primary align-[-2px]" />
                Wants to be: <span className="text-primary">{b.career_ambition}</span>
              </p>
            )}

            {bio ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                {expanded ? bio : excerpt}
                {bio.length > 220 && (
                  <button
                    type="button"
                    className="ml-1 text-primary hover:underline font-medium"
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? 'show less' : 'read more'}
                  </button>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No bio yet — a short story makes this person real to sponsors and visitors.
              </p>
            )}

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {chips.slice(0, 10).map((c) => (
                  <span key={c} className="rounded-full bg-primary/10 text-primary text-[11px] px-2.5 py-0.5 max-w-full truncate">
                    {c}
                  </span>
                ))}
                {chips.length > 10 && (
                  <span className="text-[11px] text-muted-foreground px-1 py-0.5">+{chips.length - 10}</span>
                )}
              </div>
            )}

            {onOpenBio && (
              <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 text-xs" onClick={onOpenBio}>
                <BookOpen className="h-3.5 w-3.5 mr-1" /> {hasAnything ? 'Edit bio' : 'Write a bio'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
