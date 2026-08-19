"use client";

import type { FormEvent } from "react";
import type { SearchMode } from "@/lib/types";

type SearchPanelProps = {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  query: string;
  onQueryChange: (query: string) => void;
  radius: string;
  onRadiusChange: (radius: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  searching: boolean;
  status: string;
  busy: boolean;
};

const MODES: { value: SearchMode; label: string }[] = [
  { value: "object", label: "Object name" },
  { value: "coordinates", label: "Coordinates" },
];

export function SearchPanel({
  mode,
  onModeChange,
  query,
  onQueryChange,
  radius,
  onRadiusChange,
  onSubmit,
  searching,
  status,
  busy,
}: SearchPanelProps) {
  const byObject = mode === "object";

  return (
    <section className="workspace__aside" aria-label="Archive search">
      <p className="kicker">
        MAST search <span className="kicker--accent">•</span> HST / image
      </p>
      <h2 className="search__title">
        Find a new
        <br />
        <em>window</em> into space.
      </h2>
      <p className="search__copy">
        Search the Hubble archive by an object name or a precise point in the sky.
      </p>

      <div className="mode-switch" role="group" aria-label="Search mode">
        {MODES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            aria-pressed={mode === entry.value}
            onClick={() => onModeChange(entry.value)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <form className="search__form" onSubmit={onSubmit}>
        <label className="field">
          <span>{byObject ? "Target identifier" : "RA / DEC in degrees"}</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={byObject ? "M51, NGC 6302..." : "202.469575, 47.195258"}
          />
        </label>
        <label className="field">
          <span>Search radius (degrees)</span>
          <input
            name="radius"
            inputMode="decimal"
            value={radius}
            onChange={(event) => onRadiusChange(event.target.value)}
          />
        </label>
        <button className="btn btn--primary search__submit" type="submit" disabled={searching}>
          {searching ? "Querying..." : "Launch query"}
          <span aria-hidden="true">↗</span>
        </button>
      </form>

      <p className="search__status" data-busy={busy} role="status">
        <span className="dot" aria-hidden="true" />
        {status}
      </p>
    </section>
  );
}
