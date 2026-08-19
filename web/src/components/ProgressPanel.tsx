"use client";

import type { ProcessProgress } from "@/lib/types";

type Line = {
  label: string;
  value: string;
  percent: number;
  note: string;
};

type ProgressPanelProps = {
  progress: ProcessProgress;
  lines: Line[];
  sticky?: boolean;
};

export function ProgressPanel({ progress, lines, sticky = false }: ProgressPanelProps) {
  return (
    <section
      className={`panel panel--sunken progress ${sticky ? "progress--sticky" : ""}`}
      aria-live="polite"
    >
      <p className="progress__message">
        <span className="progress__spinner" aria-hidden="true" />
        {progress.message}
      </p>
      {lines.map((line) => (
        <div className="progress__line" key={line.label}>
          <header>
            <span className="kicker">{line.label}</span>
            <strong>{line.value}</strong>
          </header>
          <div
            className="progress__track"
            role="progressbar"
            aria-label={line.label}
            aria-valuenow={line.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${line.percent}%` }} />
          </div>
          <small>{line.note}</small>
        </div>
      ))}
    </section>
  );
}

/** Download + processing lines for an archive download run. */
export function downloadLines(progress: ProcessProgress, observationCount: number): Line[] {
  return [
    {
      label: "Downloads",
      value: `${progress.downloadPercent}%`,
      percent: progress.downloadPercent,
      note: progress.filesFound
        ? `${progress.filesFound} FITS product(s) found`
        : `Estimating products for ${observationCount} observation(s)...`,
    },
    processingLine(progress, "Waiting for downloads..."),
  ];
}

/** Local-FITS lines: nothing is downloaded, so the first bar is always full. */
export function reprocessLines(progress: ProcessProgress): Line[] {
  return [
    {
      label: "Local FITS",
      value: "Ready",
      percent: 100,
      note: `${progress.filesFound} existing FITS file(s) selected`,
    },
    processingLine(progress, "Waiting to process..."),
  ];
}

function processingLine(progress: ProcessProgress, idleNote: string): Line {
  return {
    label: "Image processing",
    value: `${progress.processingPercent}%`,
    percent: progress.processingPercent,
    note: progress.totalFiles
      ? `${progress.filesProcessed} of ${progress.totalFiles} PNG previews created`
      : idleNote,
  };
}

/**
 * The image library shows whichever job is running, and a local reprocess has
 * no download stage — pick the matching pair of lines from the payload itself.
 */
export function autoLines(progress: ProcessProgress, observationCount: number): Line[] {
  const localOnly = progress.stage === "processing" && progress.downloadPercent === 100;
  return localOnly ? reprocessLines(progress) : downloadLines(progress, observationCount);
}
