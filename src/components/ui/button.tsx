import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none";
    const variants = {
      default: "bg-[#1c1915] text-white hover:bg-black",
      outline: "border border-[#1c1915] text-[#1c1915] hover:bg-[#1c1915] hover:text-white",
      ghost: "text-[#1c1915] hover:bg-[#f1f1f1]",
    };
    const sizes = {
      default: "h-11 px-6 text-sm",
      sm: "h-9 px-4 text-xs",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10",
    };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
    );
  }
);
Button.displayName = "Button";
