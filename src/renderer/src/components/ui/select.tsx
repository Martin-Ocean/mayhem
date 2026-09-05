import * as React from "react";
import { cn } from "@/lib/utils";

// A plain, styled native <select> rather than the full Radix Select primitive -- keeps this
// migration's scope reasonable while still matching the shadcn input/button visual language.
// Swap for `npx shadcn add select` later if the richer Radix-based combobox is ever needed.
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export { Select };
