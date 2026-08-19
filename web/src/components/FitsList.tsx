"use client";

import { EmptyState } from "@/components/EmptyState";
import { formatBytes } from "@/lib/format";
import type { LibraryFile } from "@/lib/types";

type FitsListProps = {
  files: LibraryFile[];
  selected: string[];
  onToggle: (path: string) => void;
};

export function FitsList({ files, selected, onToggle }: FitsListProps) {
  if (!files.length) {
    return (
      <EmptyState icon="▧" title="No FITS products indexed yet." chip="/hubble_images/**/*.fits">
        Download an observation from the observatory view and its raw FITS products will be listed
        here, ready to reprocess.
      </EmptyState>
    );
  }

  return (
    <div className="rows">
      {files.map((file) => {
        const checked = selected.includes(file.path);
        return (
          <label key={file.path} className="row row--fits" data-checked={checked}>
            <input type="checkbox" checked={checked} onChange={() => onToggle(file.path)} />
            <span className="row__glyph" aria-hidden="true">▧</span>
            <strong>{file.name}</strong>
            <small>{formatBytes(file.size)}</small>
          </label>
        );
      })}
    </div>
  );
}
