import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransparencyBackdrop } from "./transparency-backdrop";

type CompareSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Renders a checkerboard backdrop behind the "after" image (useful when it has transparency). */
  transparentAfter?: boolean;
  className?: string;
};

/**
 * Draggable before/after comparison slider. Shared by remove-background and
 * background-replace result cards.
 */
export function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  transparentAfter = false,
  className,
}: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  }

  function onPointerUp(e: React.PointerEvent) {
    draggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-48 select-none overflow-hidden rounded-lg border border-input",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/20">
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        {transparentAfter ? (
          <TransparencyBackdrop className="absolute inset-0 min-h-0 rounded-none border-none" />
        ) : null}
        <img
          src={afterSrc}
          alt={afterLabel}
          className="relative max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>

      <div
        className="absolute inset-y-0 flex w-0 -translate-x-1/2 items-center justify-center"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 w-px bg-primary/80" />
        <div
          className="flex size-8 cursor-ew-resize items-center justify-center rounded-full border bg-background shadow-md touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <MoveHorizontal className="size-4" />
        </div>
      </div>

      <span className="pointer-events-none absolute left-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {afterLabel}
      </span>
    </div>
  );
}
