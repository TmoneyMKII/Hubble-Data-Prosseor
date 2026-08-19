"use client";

import type { Observation } from "@/lib/types";

type ObservationListProps = {
  observations: Observation[];
  selected: string[];
  onToggle: (obsId: string) => void;
};

export function ObservationList({ observations, selected, onToggle }: ObservationListProps) {
  return (
    <div className="rows">
      {observations.map((observation) => {
        const checked = selected.includes(observation.obs_id);
        return (
          <label
            key={observation.obs_id}
            className="row row--observation"
            data-checked={checked}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(observation.obs_id)}
            />
            <strong>{observation.obs_id}</strong>
            <span>
              {observation.target_name} · {observation.instrument_name}
            </span>
            <small>
              {observation.filters || "Filter unavailable"} ·{" "}
              {observation.t_exptime ? `${observation.t_exptime} s` : "Exposure unavailable"}
            </small>
          </label>
        );
      })}
    </div>
  );
}
