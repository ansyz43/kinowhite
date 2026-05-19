import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-[12px] font-semibold uppercase tracking-[0.06em] text-[#69727d]", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
