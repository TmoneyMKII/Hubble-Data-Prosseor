"use client";

import { useTheme, type Theme } from "@/hooks/useTheme";
import type { WorkspaceView } from "@/lib/types";

type NavEntry = {
  view: WorkspaceView;
  glyph: string;
  label: string;
  count?: number;
};

type SidebarProps = {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  imageCount: number;
  fitsCount: number;
};

/** Sun / crescent drawn inline: emoji glyphs render inconsistently per platform. */
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {theme === "dark" ? (
        <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" strokeLinejoin="round" />
      ) : (
        <>
          <circle cx="8" cy="8" r="3.1" />
          <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function Sidebar({ activeView, onSelectView, imageCount, fitsCount }: SidebarProps) {
  const { theme, toggle } = useTheme();

  const entries: NavEntry[] = [
    { view: "observatory", glyph: "◈", label: "Observatory" },
    { view: "images", glyph: "⌁", label: "Image library", count: imageCount },
    { view: "fits", glyph: "▦", label: "FITS archive", count: fitsCount },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">✦</span>
        <span className="brand__label">
          HUBBLE<span className="brand__muted">.LOCAL</span>
        </span>
      </div>

      <nav className="nav" aria-label="Workspace">
        {entries.map((entry) => (
          <button
            key={entry.view}
            type="button"
            className="nav__item"
            aria-current={activeView === entry.view ? "page" : undefined}
            onClick={() => onSelectView(entry.view)}
          >
            <span className="nav__glyph" aria-hidden="true">{entry.glyph}</span>
            {entry.label}
            {entry.count !== undefined && <span className="nav__count">{entry.count}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <p className="sidebar__status">
          <span className="dot" aria-hidden="true" />
          Local Python engine <b>online</b>
        </p>
        <p className="sidebar__note">
          MAST data is queried by the existing Python processor. This console watches your local
          output folder.
        </p>
        <p className="sidebar__version">
          <span>HUBBLE PROCESSOR</span>
          <span>v0.1</span>
        </p>
      </div>

      <button
        type="button"
        className="theme-toggle"
        onClick={toggle}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        <ThemeIcon theme={theme} />
        <span>{theme === "dark" ? "Dark" : "Light"}</span>
      </button>
    </aside>
  );
}
