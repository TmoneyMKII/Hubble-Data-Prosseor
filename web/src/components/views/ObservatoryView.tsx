"use client";

import { EmptyState } from "@/components/EmptyState";
import { ObservationList } from "@/components/ObservationList";
import { downloadLines, ProgressPanel } from "@/components/ProgressPanel";
import { RenderStyleToggle } from "@/components/RenderStyleToggle";
import { LazyHubbleScene } from "@/components/scene/LazyHubbleScene";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import type { Observation, ProcessProgress, RenderStyle, SearchMode } from "@/lib/types";

type ObservatoryViewProps = {
  query: string;
  mode: SearchMode;
  observations: Observation[];
  selected: string[];
  onToggle: (obsId: string) => void;
  onToggleAll: () => void;
  onProcess: () => void;
  processing: boolean;
  progress: ProcessProgress | null;
  renderStyle: RenderStyle;
  onRenderStyleChange: (style: RenderStyle) => void;
  searched: boolean;
};

export function ObservatoryView({
  query,
  mode,
  observations,
  selected,
  onToggle,
  onToggleAll,
  onProcess,
  processing,
  progress,
  renderStyle,
  onRenderStyleChange,
  searched,
}: ObservatoryViewProps) {
  return (
    <>
      <LazyHubbleScene target={query} mode={mode} />

      {processing && progress && (
        <ProgressPanel progress={progress} lines={downloadLines(progress, selected.length)} />
      )}

      {observations.length > 0 ? (
        <>
          <SelectionToolbar
            selectedCount={selected.length}
            totalCount={observations.length}
            onToggleAll={onToggleAll}
            actionLabel="Download & process"
            busyLabel="Processing..."
            busy={processing}
            onAction={onProcess}
          />
          <RenderStyleToggle
            value={renderStyle}
            onChange={onRenderStyleChange}
            disabled={processing}
          />
          <ObservationList
            observations={observations}
            selected={selected}
            onToggle={onToggle}
          />
        </>
      ) : (
        searched && (
          <EmptyState icon="⊹" title="No observations matched that search.">
            Try a wider search radius, or switch between object-name and coordinate mode.
          </EmptyState>
        )
      )}
    </>
  );
}
