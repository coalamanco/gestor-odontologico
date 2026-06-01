import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--clinic-primary)] text-white shadow-lg shadow-cyan-100 hover:bg-[var(--clinic-primary-dark)] hover:shadow-cyan-200",
        destructive:
          "bg-rose-500 text-white shadow-lg shadow-rose-100 hover:bg-rose-600",
        outline:
          "border border-[var(--clinic-border)] bg-white text-[var(--clinic-primary)] shadow-sm hover:bg-[var(--clinic-primary-soft)] hover:border-[var(--clinic-border-strong)]",
        secondary:
          "bg-[var(--clinic-primary-soft)] text-[var(--clinic-primary-dark)] hover:bg-[#e2f7f6]",
        ghost:
          "text-[var(--clinic-primary)] hover:bg-[var(--clinic-primary-soft)] hover:text-[var(--clinic-primary-dark)]",
        link:
          "text-[var(--clinic-primary)] underline-offset-4 hover:text-[var(--clinic-primary-dark)] hover:underline",
        header:
          "border border-white/35 bg-white/15 text-white shadow-sm backdrop-blur hover:bg-white/25",
        headerLight:
          "border border-white/70 bg-white text-[var(--clinic-primary)] shadow-sm hover:bg-[#fbffff]",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-14 rounded-2xl px-10 text-base",
        icon: "h-12 w-12",
        header: "h-11 rounded-2xl px-4 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "header"
    | "headerLight";
  size?: "default" | "sm" | "lg" | "icon" | "header";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
