import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { Sparkles, ImageOff } from 'lucide-react';
import { format } from 'date-fns';

export function DonorImpactStoriesTab() {
  const { impactStories, storiesLoading, sponsoredBeneficiaries } = useDonorPortal();

  if (storiesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!impactStories || impactStories.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 text-center text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No impact stories yet</p>
          <p className="text-sm mt-1">
            Stories about your sponsored beneficiaries will appear here as the organization publishes them.
          </p>
        </CardContent>
      </Card>
    );
  }

  const nameById = new Map(
    (sponsoredBeneficiaries || [])
      .map((bd: any) => bd.beneficiary)
      .filter(Boolean)
      .map((b: any) => [b.id, b.display_name]),
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {impactStories.map((s: any) => {
        const cover = s.photo_urls?.[0];
        return (
          <Card key={s.id} className="border-border/50 overflow-hidden flex flex-col">
            {cover ? (
              <div className="aspect-[16/9] bg-muted overflow-hidden">
                <img src={cover} alt={s.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <ImageOff className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
            <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                {s.theme && <Badge variant="secondary" className="text-[10px]">{s.theme}</Badge>}
                {nameById.get(s.beneficiary_id) && (
                  <Badge variant="outline" className="text-[10px]">{nameById.get(s.beneficiary_id)}</Badge>
                )}
              </div>
              <h3 className="font-semibold text-foreground leading-snug">{s.title}</h3>
              {s.story_text && (
                <p className="text-sm text-muted-foreground line-clamp-4 flex-1">{s.story_text}</p>
              )}
              {s.published_at && (
                <p className="text-xs text-muted-foreground">
                  Published {format(new Date(s.published_at), 'MMM d, yyyy')}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}