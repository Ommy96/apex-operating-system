import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { Sparkles, ImageOff } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function viewStoryPhoto(storyId: string) {
  const win = window.open('', '_blank');
  if (win) win.opener = null;
  const { data, error } = await supabase.functions.invoke('donor-story-photo', { body: { story_id: storyId, index: 0 } });
  const message = error?.message || (data as any)?.error;
  if (message || !(data as any)?.url) {
    win?.close();
    toast.error(message || 'Photo not available');
    return;
  }
  if (win) win.location.href = (data as any).url;
  else window.location.assign((data as any).url);
}

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

  const nameById = new Map<string, string>(
    (sponsoredBeneficiaries || [])
      .map((bd: any) => bd.beneficiary)
      .filter(Boolean)
      .map((b: any) => [String(b.id), String(b.display_name ?? '')] as [string, string]),
  );


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {impactStories.map((s: any) => {
        const cover = s.photo_urls?.[0];
        return (
          <Card key={s.id} className="border-border/50 overflow-hidden flex flex-col">
            {cover ? (
              <button
                type="button"
                onClick={() => viewStoryPhoto(s.id)}
                className="aspect-[16/9] w-full bg-muted/40 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/60"
              >
                <Sparkles className="h-6 w-6 text-muted-foreground/60" />
                View photo
              </button>
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