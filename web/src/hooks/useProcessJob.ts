"use client";

import { useCallback, useState } from "react";
import { getJson, postJson } from "@/lib/api";
import type { ProcessProgress } from "@/lib/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RunOptions = {
  url: string;
  body: unknown;
  seed: ProcessProgress;
  pollMs?: number;
  onProgress?: (progress: ProcessProgress) => void;
};

/**
 * Starts a Python worker job and polls `/api/process/[jobId]` until it settles.
 * Resolves with the final progress payload, or throws if the job errors.
 */
export function useProcessJob() {
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async ({ url, body, seed, pollMs = 700, onProgress }: RunOptions) => {
    setRunning(true);
    setProgress(seed);
    onProgress?.(seed);
    try {
      const { jobId } = await postJson<{ jobId: string }>(url, body, "Processing failed");
      for (;;) {
        await delay(pollMs);
        const next = await getJson<ProcessProgress>(`/api/process/${jobId}`);
        setProgress(next);
        onProgress?.(next);
        if (next.state === "error") throw new Error(next.error ?? next.message);
        if (next.state === "complete") return next;
      }
    } finally {
      setRunning(false);
    }
  }, []);

  return { progress, running, run };
}
