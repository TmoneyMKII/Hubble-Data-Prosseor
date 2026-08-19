"use client";

import type { RenderStyle } from "@/lib/types";

type RenderStyleToggleProps = {
  value: RenderStyle;
  onChange: (style: RenderStyle) => void;
  disabled?: boolean;
};

const OPTIONS: { value: RenderStyle; label: string; hint: string }[] = [
  { value: "clean", label: "Clean image", hint: "No graph" },
  { value: "graph", label: "Scientific graph", hint: "Axes + metadata" },
];

export function RenderStyleToggle({ value, onChange, disabled }: RenderStyleToggleProps) {
  return (
    <div className="segmented" role="group" aria-label="Output style">
      <p className="kicker">Output style</p>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          <small>{option.hint}</small>
        </button>
      ))}
    </div>
  );
}
