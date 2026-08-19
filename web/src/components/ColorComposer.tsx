"use client";

import type { ColorChannels, LibraryFile } from "@/lib/types";

type ColorComposerProps = {
  fitsFiles: LibraryFile[];
  channels: ColorChannels;
  onChange: (channels: ColorChannels) => void;
  onAutoFill: () => void;
  onCompose: () => void;
  loading: boolean;
};

const CHANNELS = ["red", "green", "blue"] as const;

export function ColorComposer({
  fitsFiles,
  channels,
  onChange,
  onAutoFill,
  onCompose,
  loading,
}: ColorComposerProps) {
  const disabled = loading || !fitsFiles.length;

  return (
    <section className="panel panel--sunken composer" aria-label="Colour composer">
      <div>
        <p className="kicker">Color composer</p>
        <h3>Build a false-color image</h3>
      </div>
      <p>
        Each FITS file is one filter band. Assign bands to RGB; suggestions are based on filter
        wavelength.
      </p>

      <div className="composer__channels">
        {CHANNELS.map((channel) => (
          <label key={channel}>
            <span style={{ color: `var(--channel-${channel})` }}>{channel} channel</span>
            <select
              value={channels[channel]}
              onChange={(event) => onChange({ ...channels, [channel]: event.target.value })}
            >
              <option value="">Choose a FITS band</option>
              {fitsFiles.map((file) => (
                <option key={file.path} value={file.path}>
                  {file.filter ?? "Unknown"} - {file.name} ({file.colorHint ?? "manual"})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="composer__actions">
        <button type="button" className="btn btn--outline" disabled={disabled} onClick={onAutoFill}>
          Auto-fill suggested RGB
        </button>
        <button type="button" className="btn btn--primary" disabled={disabled} onClick={onCompose}>
          {loading ? "Working..." : "Create color PNG"}
        </button>
      </div>
    </section>
  );
}
