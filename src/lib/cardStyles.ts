import { cn } from "@/lib/utils";

// Card gradient color system utilities
export const cardGradients = [
  "bg-gradient-card-blue",
  "bg-gradient-card-emerald", 
  "bg-gradient-card-orange",
  "bg-gradient-card-purple",
  "bg-gradient-card-pink",
  "bg-gradient-card-indigo"
] as const;

export const cardBorders = [
  "border-card-blue",
  "border-card-emerald",
  "border-card-orange", 
  "border-card-purple",
  "border-card-pink",
  "border-card-indigo"
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