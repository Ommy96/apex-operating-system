import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "lg",
}: DetailPanelProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full bg-card border-l border-border/50 shadow-xl z-50 flex flex-col animate-slide-in-right",
          widthClasses[width]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-lg font-semibold text-foreground truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-lg shrink-0 ml-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">{children}</div>
        </ScrollArea>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border/50 shrink-0 bg-muted/30">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
