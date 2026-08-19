"use client";

import { Overlay } from "@/components/Overlay";
import { fileUrl, formatBytes } from "@/lib/format";
import type { LibraryFile } from "@/lib/types";

type LightboxProps = {
  file: LibraryFile;
  onClose: () => void;
};

export function Lightbox({ file, onClose }: LightboxProps) {
  return (
    <Overlay label={file.name} onClose={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local API-streamed file, no loader */}
      <img className="lightbox__image" src={fileUrl(file.path)} alt={file.name} />
      <div className="lightbox__meta">
        <strong>{file.name}</strong>
        <span>{formatBytes(file.size)} · local capture</span>
      </div>
    </Overlay>
  );
}
