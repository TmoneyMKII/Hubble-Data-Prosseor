export type ProcessJob = {
  id: string;
  state: "queued" | "running" | "complete" | "error";
  stage: "search" | "download" | "processing" | "complete" | "error";
  message: string;
  downloadPercent: number;
  processingPercent: number;
  filesFound: number;
  filesProcessed: number;
  totalFiles: number;
  error?: string;
  processed?: number;
};

const jobs = new Map<string, ProcessJob>();

export function createJob(): ProcessJob {
  const job: ProcessJob = { id: crypto.randomUUID(), state: "queued", stage: "search", message: "Waiting for the Python worker...", downloadPercent: 0, processingPercent: 0, filesFound: 0, filesProcessed: 0, totalFiles: 0 };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string) { return jobs.get(id); }

export function updateJob(id: string, update: Partial<ProcessJob>) {
  const job = jobs.get(id);
  if (job) Object.assign(job, update);
}