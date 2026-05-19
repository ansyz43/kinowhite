import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-sm border border-[#dad8d6] bg-[#f1f1f1] px-4 py-2 text-[15px] text-[#1c1915] placeholder:text-[#aba9a7] focus:border-[#1c1915] focus:outline-none transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
