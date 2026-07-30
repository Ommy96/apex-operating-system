import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ExternalLink, Bookmark, RefreshCw, Target, Calendar, DollarSign } from 'lucide-react';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { useGrantDiscovery, DiscoveredOpportunity } from '@/hooks/useGrantDiscovery';
import { format } from 'date-fns';

function scoreColor(s: number) {
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-warning';
  return 'text-muted-foreground';
}

function OpportunityCard({ opp, onSave }: { opp: DiscoveredOpportunity; onSave: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {opp.title}
            </CardTitle>
            <CardDescription>{opp.funder_name}</CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor(opp.match_score)}`}>{opp.match_score}</div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Match</div>
          </div>
        </div>
        <Progress value={opp.match_score} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{opp.summary}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {opp.estimated_amount ? (
            <Badge variant="secondary" className="gap-1"><DollarSign className="h-3 w-3" />{opp.currency} {Number(opp.estimated_amount).toLocaleString()}</Badge>
          ) : null}
          {opp.deadline ? (
            <Badge variant="secondary" className="gap-1"><Calendar className="h-3 w-3" />{(() => { try { return format(new Date(opp.deadline), 'MMM d, yyyy'); } catch { return opp.deadline; } })()}</Badge>
          ) : null}
          {opp.sectors?.slice(0, 3).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          {opp.sdg_focus?.slice(0, 3).map((n) => <Badge key={`sdg-${n}`} variant="outline">SDG {n}</Badge>)}
        </div>
        {opp.match_reasons?.length ? (
          <div className="rounded-md bg-muted/40 p-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Why it fits</p>
            <ul className="text-xs space-y-0.5 list-disc pl-4">
              {opp.match_reasons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-2 gap-2">
          {opp.url ? (
            <Button variant="ghost" size="sm" asChild>
              <a href={opp.url} target="_blank" rel="noreferrer" className="gap-1">
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          ) : <span />}
          <Button size="sm" onClick={onSave} className="gap-1"><Bookmark className="h-3.5 w-3.5" />Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GrantDiscovery() {
  const { opportunities, loading, generatedAt, lastError, run, saveOpportunity } = useGrantDiscovery();

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="AI Grant Discovery"
        description="Find funding opportunities ranked against your organization's sector, programs, and focus areas."
        icon={Sparkles}
      />

      {lastError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 space-y-2 text-sm">
            <p className="font-medium text-destructive">Grant discovery couldn't run</p>
            <p className="text-muted-foreground text-xs">{lastError}</p>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
              <li>The grant-discovery edge function may not be deployed yet.</li>
              <li>The LOVABLE_API_KEY secret may be missing on the Supabase project.</li>
              <li>The organization profile may be incomplete (sector, country, programmes).</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {generatedAt ? `Last run: ${format(new Date(generatedAt), 'PPpp')}` : 'Run discovery to surface matched grants.'}
        </div>
        <Button onClick={run} disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Discovering...' : opportunities.length ? 'Re-run Discovery' : 'Run Discovery'}
        </Button>
      </div>

      {loading && opportunities.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No opportunities yet. Add curated funding sources in Settings or click Run Discovery to get AI-suggested matches.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((o, i) => (
            <OpportunityCard key={`${o.title}-${i}`} opp={o} onSave={() => saveOpportunity(o)} />
          ))}
        </div>
      )}
    </div>
  );
}