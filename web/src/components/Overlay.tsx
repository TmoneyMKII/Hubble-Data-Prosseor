"use client";

import { useEffect, useRef, type ReactNode } from "react";

type OverlayProps = {
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

/** Modal scaffold: click-outside, Escape to close and focus moved into the panel. */
export function Overlay({ label, onClose, className = "", children }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className={`overlay__panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="overlay__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
