import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold tracking-wide ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:shadow-elevation-2 active:scale-95 button-press micro-interaction ripple [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-accent text-accent-foreground hover:shadow-elevation-3 hover:-translate-y-0.5 shadow-elevation-1",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-elevation-2 shadow-elevation-1",
        outline:
          "border-2 border-border bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-elevation-2 shadow-soft",
        secondary:
          "bg-gradient-secondary text-secondary-foreground hover:shadow-elevation-2 hover:-translate-y-0.5 shadow-elevation-1",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground backdrop-blur-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-accent",
        primary: "bg-gradient-primary text-primary-foreground hover:shadow-glow hover:-translate-y-1 shadow-elevation-2 glow-effect",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:shadow-elevation-2 shadow-elevation-1",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 hover:shadow-elevation-2 shadow-elevation-1",
        accent: "bg-gradient-accent text-accent-foreground hover:shadow-glow hover:-translate-y-1 shadow-elevation-2 glow-effect",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-xl px-4 text-xs",
        lg: "h-14 rounded-2xl px-10 text-base",
        xl: "h-16 rounded-2xl px-12 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
