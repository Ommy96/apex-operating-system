import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold tracking-wide ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] hover:shadow-glow hover:-translate-y-0.5 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-poppins",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-white shadow-medium hover:shadow-strong hover:bg-gradient-accent",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-medium hover:shadow-strong",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-gradient-primary hover:text-white shadow-soft hover:border-transparent",
        secondary:
          "bg-gradient-secondary text-white shadow-soft hover:shadow-medium hover:bg-gradient-warm",
        primary:
          "bg-gradient-primary text-white shadow-medium hover:shadow-strong hover:shadow-glow",
        success:
          "bg-gradient-to-r from-success to-success/90 text-success-foreground shadow-medium hover:shadow-strong",
        warning:
          "bg-gradient-to-r from-warning to-warning/90 text-warning-foreground shadow-medium hover:shadow-strong",
        ghost: "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow-soft",
        link: "text-primary underline-offset-4 hover:underline hover:text-accent",
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
