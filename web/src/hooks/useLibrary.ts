"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getJson } from "@/lib/api";
import type { LibraryFile } from "@/lib/types";

const LIBRARY_ERROR = "Could not read local library";

async function fetchLibrary() {
  const data = await getJson<{ files?: LibraryFile[] }>("/api/library");
  return data.files ?? [];
}

/** Reads the local `hubble_images` folder index and keeps it refreshable. */
export function useLibrary(onError?: (message: string) => void) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setFiles(await fetchLibrary());
    } catch {
      onError?.(LIBRARY_ERROR);
    }
  }, [onError]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = await fetchLibrary();
        if (active) setFiles(next);
      } catch {
        if (active) onError?.(LIBRARY_ERROR);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // The initial read runs once; `refresh` covers every later reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const imageFiles = useMemo(() => files.filter((file) => file.type === "image"), [files]);
  const fitsFiles = useMemo(() => files.filter((file) => file.type === "fits"), [files]);

  return { files, imageFiles, fitsFiles, loading, refresh };
}
