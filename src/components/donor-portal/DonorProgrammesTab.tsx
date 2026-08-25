import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { useDonorFx, FX_DISCLOSURE } from '@/hooks/useDonorFx';
import { FxAmount } from './FxAmount';
import { Building2, Users, Sparkles } from 'lucide-react';

interface Props {
  onSelectProgramme?: (programmeId: string) => void;
}

export function DonorProgrammesTab({ onSelectProgramme }: Props) {
  const { programmes, impactStories, currency, totals } = useDonorPortal();
  const fx = useDonorFx(currency);

  if (!programmes.length) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No programmes yet</p>
          <p className="text-sm mt-1">
            Once your beneficiaries are enrolled, the programmes you support will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{FX_DISCLOSURE}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programmes.map((p) => {
          const stories = (impactStories || []).filter((s: any) => s.program_id === p.id);
          return (
            <Card key={p.id} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    {p.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <Users className="h-3 w-3 mr-1" />
                    {p.count}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border/40">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Your beneficiaries</p>
                    <p className="font-semibold text-foreground">{p.count}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">You contributed</p>
                    <FxAmount
                      amount={p.contributedBase}
                      currency={p.currency || totals.currency}
                      fx={fx}
                      className="font-semibold text-success"
                    />
                  </div>
                </div>

                {stories.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> {stories.length} published impact{' '}
                    {stories.length === 1 ? 'story' : 'stories'}
                  </p>
                )}

                {onSelectProgramme && (
                  <Button variant="outline" size="sm" onClick={() => onSelectProgramme(p.id)}>
                    View my beneficiaries in this programme
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
