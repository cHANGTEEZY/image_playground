import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

/**
 * Retry-capable inline error banner for Result cards. Toasts remain for
 * transient success/info; persistent API/validation failures render here so
 * the user can see the message and immediately retry without re-uploading.
 */
export function InlineError({
  message,
  onRetry,
  retrying,
  className,
}: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 space-y-2">
        <p className="leading-relaxed">{message}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
            className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <RotateCw className={cn("size-3.5", retrying && "animate-spin")} />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
