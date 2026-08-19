"use client";

import { ImageLibrary } from "@/components/ImageLibrary";
import { autoLines, ProgressPanel } from "@/components/ProgressPanel";
import type { LibraryFile, ProcessProgress } from "@/lib/types";

type ImagesViewProps = {
  files: LibraryFile[];
  processing: boolean;
  progress: ProcessProgress | null;
  observationCount: number;
  onOpen: (file: LibraryFile) => void;
  onGenerateCaption: (file: LibraryFile) => void;
  onOpenLocalFile: (file: LibraryFile) => void;
  captionLoading: boolean;
};

export function ImagesView({
  files,
  processing,
  progress,
  observationCount,
  onOpen,
  onGenerateCaption,
  onOpenLocalFile,
  captionLoading,
}: ImagesViewProps) {
  return (
    <>
      {processing && progress && (
        <ProgressPanel progress={progress} lines={autoLines(progress, observationCount)} sticky />
      )}
      <ImageLibrary
        files={files}
        onOpen={onOpen}
        onGenerateCaption={onGenerateCaption}
        onOpenLocalFile={onOpenLocalFile}
        captionLoading={captionLoading}
      />
    </>
  );
}
