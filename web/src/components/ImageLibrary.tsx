"use client";

import { EmptyState } from "@/components/EmptyState";
import { fileUrl, formatBytes } from "@/lib/format";
import type { LibraryFile } from "@/lib/types";

type ImageLibraryProps = {
  files: LibraryFile[];
  onOpen: (file: LibraryFile) => void;
  onGenerateCaption: (file: LibraryFile) => void;
  onOpenLocalFile: (file: LibraryFile) => void;
  captionLoading: boolean;
};

export function ImageLibrary({
  files,
  onOpen,
  onGenerateCaption,
  onOpenLocalFile,
  captionLoading,
}: ImageLibraryProps) {
  if (!files.length) {
    return (
      <EmptyState icon="⊹" title="Your image library is quiet." chip="/hubble_images/**/*.png">
        Processed PNG previews will appear here after you run a download and image processing pass.
      </EmptyState>
    );
  }

  return (
    <div className="image-grid">
      {files.map((file) => (
        <article className="image-card" key={file.path}>
          <button type="button" className="image-card__open" onClick={() => onOpen(file)}>
            <div className="image-card__preview">
              {/* eslint-disable-next-line @next/next/no-img-element -- local API-streamed file, no loader */}
              <img src={fileUrl(file.path)} alt={file.name} loading="lazy" />
              <span aria-hidden="true">VIEW ↗</span>
            </div>
            <div className="image-card__meta">
              <strong>{file.name}</strong>
              <small>
                {formatBytes(file.size)}
                <span aria-hidden="true">·</span>
                PNG
              </small>
            </div>
          </button>
          <div className="image-card__actions">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => onGenerateCaption(file)}
              disabled={captionLoading}
            >
              ✎ {captionLoading ? "Writing..." : "Generate post"}
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => onOpenLocalFile(file)}
            >
              ⌂ Open local file
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
