import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDisaggregationCategories, useIndicatorDisaggregation } from "@/hooks/useDisaggregation";

interface Props {
  indicatorId: string;
}

export function DisaggregationPanel({ indicatorId }: Props) {
  const { data: categories = [] } = useDisaggregationCategories();
  const [categoryId, setCategoryId] = useState<string>("all");
  const { data: rows = [], isLoading } = useIndicatorDisaggregation(
    indicatorId,
    categoryId === "all" ? undefined : categoryId,
  );

  const total = useMemo(() => rows.reduce((acc, r) => acc + r.total, 0), [rows]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Disaggregation</CardTitle>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No disaggregated values recorded for this indicator yet.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const pct = total > 0 ? (r.total / total) * 100 : 0;
              return (
                <div key={r.dimension_value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.dimension_value}</span>
                      {r.category_name && <Badge variant="outline" className="text-xs">{r.category_name}</Badge>}
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      {r.total.toLocaleString()} <span className="text-xs">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}