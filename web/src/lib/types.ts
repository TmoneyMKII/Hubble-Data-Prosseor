export type LibraryFile = {
  name: string;
  path: string;
  type: "image" | "fits";
  size: number;
  modified: string;
  filter?: string;
  colorHint?: string;
};

export type Observation = {
  obs_id: string;
  target_name: string;
  instrument_name: string;
  filters: string;
  t_exptime: string;
};

export type SearchMode = "object" | "coordinates";

export type RenderStyle = "clean" | "graph";

export type WorkspaceView = "observatory" | "images" | "fits";

export type ColorChannels = {
  red: string;
  green: string;
  blue: string;
};

export type Caption = {
  title: string;
  text: string;
  target: string;
  instrument: string;
  filter: string;
};

export type ProcessProgress = {
  state: "queued" | "running" | "complete" | "error";
  stage: "search" | "download" | "processing" | "complete" | "error";
  message: string;
  downloadPercent: number;
  processingPercent: number;
  filesFound: number;
  filesProcessed: number;
  totalFiles: number;
  processed?: number;
  error?: string;
};
