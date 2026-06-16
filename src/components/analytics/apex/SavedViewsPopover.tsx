import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";
import { useAnalyticsSavedViews } from "@/hooks/useAnalyticsSavedViews";
import { AnalyticsQuestion } from "@/lib/analyticsConfig";

interface Props {
  onLoad: (q: AnalyticsQuestion) => void;
}

export function SavedViewsPopover({ onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const { savedViews, remove } = useAnalyticsSavedViews();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs">
          <Bookmark className="h-3.5 w-3.5 mr-1" /> Saved views
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1">
        {savedViews.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">No saved views yet.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {savedViews.map((v) => (
              <div key={v.id} className="flex items-center gap-1 px-1">
                <button
                  type="button"
                  className="flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => { onLoad(v.params); setOpen(false); }}
                >
                  <div className="font-medium">{v.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {v.params.tab} · {v.params.metric} by {v.params.dimension}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(v.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Delete saved view"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}