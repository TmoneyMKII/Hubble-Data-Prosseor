"use client";

import { useState } from "react";
import { Overlay } from "@/components/Overlay";
import type { Caption } from "@/lib/types";

type CaptionDialogProps = {
  caption: Caption;
  onClose: () => void;
};

export function CaptionDialog({ caption, onClose }: CaptionDialogProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Overlay label={caption.title} onClose={onClose} className="caption-dialog">
      <p className="kicker">Social post generator</p>
      <h2>{caption.title}</h2>
      <div className="caption-dialog__facts">
        <span>{caption.target}</span>
        <span>{caption.instrument}</span>
        <span>{caption.filter}</span>
      </div>
      <textarea value={caption.text} readOnly aria-label="Generated social media post" />
      <div className="caption-dialog__actions">
        <button type="button" className="btn btn--primary" onClick={copy}>
          {copied ? "Copied" : "Copy post"}
          <span aria-hidden="true">↗</span>
        </button>
        <small>Ready for Instagram, Threads, Bluesky, or X</small>
      </div>
    </Overlay>
  );
}
