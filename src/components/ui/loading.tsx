import { cn } from "@/lib/utils"

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({ className, size = "md" }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("loading-ring", sizeClasses[size], className)} />
  );
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-hero flex items-center justify-center z-50">
      <div className="text-center">
        <Loading size="lg" className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white font-poppins">Loading...</h2>
        <p className="text-white/70">Please wait while we prepare your dashboard</p>
      </div>
    </div>
  );
}