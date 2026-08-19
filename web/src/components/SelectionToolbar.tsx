"use client";

type SelectionToolbarProps = {
  selectedCount: number;
  totalCount: number;
  onToggleAll: () => void;
  actionLabel: string;
  busyLabel: string;
  busy: boolean;
  onAction: () => void;
};

/** Shared "n selected / select all / run" bar above a selectable list. */
export function SelectionToolbar({
  selectedCount,
  totalCount,
  onToggleAll,
  actionLabel,
  busyLabel,
  busy,
  onAction,
}: SelectionToolbarProps) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="toolbar">
      <span className="toolbar__count">{selectedCount} selected</span>
      <button type="button" className="btn btn--ghost" onClick={onToggleAll} disabled={!totalCount}>
        {allSelected ? "Clear selection" : "Select all"}
      </button>
      <button
        type="button"
        className="btn btn--primary"
        disabled={!selectedCount || busy}
        onClick={onAction}
      >
        {busy ? busyLabel : actionLabel}
        <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
