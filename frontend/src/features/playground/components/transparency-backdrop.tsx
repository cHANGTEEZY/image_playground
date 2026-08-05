import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Checkerboard backdrop for previewing images with transparency
 * (remove-background, background-replace results, watermark logos, etc.).
 */
export const TransparencyBackdrop = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-[linear-gradient(45deg,#e5e5e5_25%,transparent_25%),linear-gradient(-45deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e5e5_75%),linear-gradient(-45deg,transparent_75%,#e5e5e5_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] dark:bg-[linear-gradient(45deg,#333_25%,transparent_25%),linear-gradient(-45deg,#333_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#333_75%),linear-gradient(-45deg,transparent_75%,#333_75%)]",
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
TransparencyBackdrop.displayName = "TransparencyBackdrop";
