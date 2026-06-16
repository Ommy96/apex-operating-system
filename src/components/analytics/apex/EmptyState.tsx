import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{hint}</p>}
    </div>
  );
}