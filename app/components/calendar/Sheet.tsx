"use client";

import { useEffect, useRef, useState } from "react";
import { useIsClient } from "./hooks";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  /** Renders a tall panel on phones (forms) instead of content-height. */
  tall?: boolean;
}

/** Bottom sheet on phones, centered dialog on desktop. */
export default function Sheet({ open, onClose, label, children, tall }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ startY: number; dy: number } | null>(null);
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="oc-root fixed inset-0 z-[60] flex items-end justify-center lg:items-center" role="presentation">
      <div className="oc-fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`oc-sheet-in oc-shadow-sheet relative flex w-full flex-col overflow-hidden rounded-t-[18px] bg-white outline-none lg:max-w-[520px] lg:rounded-[10px] ${
          tall ? "h-[92dvh]" : "max-h-[90dvh]"
        } lg:max-h-[86vh] lg:h-auto`}
        style={{
          transform: drag?.dy ? `translateY(${drag.dy}px)` : undefined,
          transition: drag ? "none" : "transform 200ms ease",
        }}
      >
        <div
          className="flex h-[22px] shrink-0 cursor-grab items-center justify-center lg:hidden"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            setDrag({ startY: e.clientY, dy: 0 });
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag) setDrag({ startY: drag.startY, dy: Math.max(0, e.clientY - drag.startY) });
          }}
          onPointerUp={() => {
            const shouldClose = (drag?.dy ?? 0) > 90;
            setDrag(null);
            if (shouldClose) onClose();
          }}
          onPointerCancel={() => setDrag(null)}
        >
          <span className="h-1 w-9 rounded-full bg-[#D1D1D1]" />
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
