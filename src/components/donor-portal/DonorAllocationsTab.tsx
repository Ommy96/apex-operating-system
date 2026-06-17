import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { useDonorFx } from '@/hooks/useDonorFx';
import { format as fmtDate } from 'date-fns';
import { Wallet, Layers, Building2, Users, ArrowRight } from 'lucide-react';

const SCOPE_META: Record<string, { label: string; icon: any; color: string }> = {
  direct_beneficiary: { label: 'Direct sponsorship', icon: Users, color: 'text-primary' },
  project_pool: { label: 'Project pool', icon: Layers, color: 'text-accent' },
  program_unrestricted: { label: 'Program unrestricted', icon: Building2, color: 'text-success' },
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  redirected: 'outline',
  held: 'secondary',
  reversed: 'destructive',
};

export function DonorAllocationsTab() {
  const { donorAccount, donorAllocations, donorPools, allocationsLoading } = useDonorPortal();
  const fx = useDonorFx((donorAccount as any)?.preferred_currency);

  // Aggregates
  const totalAllocated = (donorAllocations || []).reduce(
    (s, a: any) => s + fx.convert(Number(a.amount_base || 0), a.base_currency),
    0,
  );
  const byScope = (donorAllocations || []).reduce((acc: Record<string, number>, a: any) => {
    const v = fx.convert(Number(a.amount_base || 0), a.base_currency);
    acc[a.scope] = (acc[a.scope] || 0) + v;
    return acc;
  }, {});
  const unallocated = (donorPools || []).reduce(
    (s, p: any) => s + fx.convert(Number(p.balance_base || 0), 'KES'),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Wallet className="h-5 w-5 text-primary" />}
          label="Total Allocated"
          value={fx.format(totalAllocated, fx.target)}
        />
        {(['direct_beneficiary', 'project_pool', 'program_unrestricted'] as const).map((s) => (
          <SummaryCard
            key={s}
            icon={(() => {
              const I = SCOPE_META[s].icon;
              return <I className={`h-5 w-5 ${SCOPE_META[s].color}`} />;
            })()}
            label={SCOPE_META[s].label}
            value={fx.format(byScope[s] || 0, fx.target)}
          />
        ))}
      </div>

      {/* Unallocated pool balances */}
      {unallocated > 0.5 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">
                {fx.format(unallocated, fx.target)} awaiting allocation
              </p>
              <p className="text-xs text-muted-foreground">
                Funds held in pools while the team identifies the best beneficiaries.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocation list */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Allocation history</CardTitle>
        </CardHeader>
        <CardContent>
          {allocationsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (donorAllocations || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No allocations yet. They will appear here the moment your donations are processed.
            </p>
          ) : (
            <div className="space-y-2">
              {(donorAllocations as any[]).map((a) => {
                const meta = SCOPE_META[a.scope] || { label: a.scope, icon: Layers, color: 'text-muted-foreground' };
                const Icon = meta.icon;
                const target =
                  a.beneficiary?.display_name ||
                  a.project?.name ||
                  a.program?.name ||
                  '—';
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    {a.beneficiary?.photo_url ? (
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={a.beneficiary.photo_url} />
                        <AvatarFallback>{(a.beneficiary.display_name || '?')[0]}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`h-9 w-9 rounded-lg bg-muted flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{target}</p>
                      <p className="text-xs text-muted-foreground">
                        {meta.label} · {fmtDate(new Date(a.allocated_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-foreground">
                        {fx.format(Number(a.amount_base || 0), a.base_currency)}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {a.native_currency !== fx.target && (
                          <span className="text-[10px] text-muted-foreground">
                            {a.native_currency} {Number(a.amount_native).toLocaleString()}
                          </span>
                        )}
                        <Badge variant={STATUS_VARIANT[a.status] || 'outline'} className="text-[10px] px-1.5 py-0">
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}