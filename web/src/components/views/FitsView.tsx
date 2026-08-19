"use client";

import { ColorComposer } from "@/components/ColorComposer";
import { FitsList } from "@/components/FitsList";
import { ProgressPanel, reprocessLines } from "@/components/ProgressPanel";
import { RenderStyleToggle } from "@/components/RenderStyleToggle";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import type { ColorChannels, LibraryFile, ProcessProgress, RenderStyle } from "@/lib/types";

type FitsViewProps = {
  files: LibraryFile[];
  selected: string[];
  onToggle: (path: string) => void;
  onToggleAll: () => void;
  onReprocess: () => void;
  processing: boolean;
  progress: ProcessProgress | null;
  renderStyle: RenderStyle;
  onRenderStyleChange: (style: RenderStyle) => void;
  channels: ColorChannels;
  onChannelsChange: (channels: ColorChannels) => void;
  onAutoFill: () => void;
  onCompose: () => void;
  colorLoading: boolean;
};

export function FitsView({
  files,
  selected,
  onToggle,
  onToggleAll,
  onReprocess,
  processing,
  progress,
  renderStyle,
  onRenderStyleChange,
  channels,
  onChannelsChange,
  onAutoFill,
  onCompose,
  colorLoading,
}: FitsViewProps) {
  return (
    <>
      <ColorComposer
        fitsFiles={files}
        channels={channels}
        onChange={onChannelsChange}
        onAutoFill={onAutoFill}
        onCompose={onCompose}
        loading={colorLoading}
      />
      <RenderStyleToggle value={renderStyle} onChange={onRenderStyleChange} disabled={processing} />
      <SelectionToolbar
        selectedCount={selected.length}
        totalCount={files.length}
        onToggleAll={onToggleAll}
        actionLabel="Reprocess selected"
        busyLabel="Processing..."
        busy={processing}
        onAction={onReprocess}
      />
      {processing && progress && (
        <ProgressPanel progress={progress} lines={reprocessLines(progress)} />
      )}
      <FitsList files={files} selected={selected} onToggle={onToggle} />
    </>
  );
}
