import { cn } from "@/lib/utils";

// Card gradient color system utilities - Navy Blue Theme
export const cardGradients = [
  "bg-gradient-card-navy",
  "bg-gradient-card-blue", 
  "bg-gradient-card-sky",
  "bg-gradient-card-purple",
  "bg-gradient-card-amber",
  "bg-gradient-card-rose"
] as const;

export const cardBorders = [
  "border-card-navy",
  "border-card-blue",
  "border-card-sky", 
  "border-card-purple",
  "border-card-amber",
  "border-card-rose"
] as const;

export type CardVariant = 0 | 1 | 2 | 3 | 4 | 5;

export const getCardStyles = (variant: CardVariant) => {
  return cn(
    cardGradients[variant],
    cardBorders[variant],
    "shadow-elevation-1 hover:shadow-elevation-3 transition-all duration-300 card-hover"
  );
};

export const getRandomCardStyles = () => {
  const variant = Math.floor(Math.random() * cardGradients.length) as CardVariant;
  return getCardStyles(variant);
};