"use client";

import { useCallback, useState, type FormEvent } from "react";
import { CaptionDialog } from "@/components/CaptionDialog";
import { Lightbox } from "@/components/Lightbox";
import { SearchPanel } from "@/components/SearchPanel";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FitsView } from "@/components/views/FitsView";
import { ImagesView } from "@/components/views/ImagesView";
import { ObservatoryView } from "@/components/views/ObservatoryView";
import { useLibrary } from "@/hooks/useLibrary";
import { useProcessJob } from "@/hooks/useProcessJob";
import { getJson, postJson } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type {
  Caption,
  ColorChannels,
  LibraryFile,
  Observation,
  RenderStyle,
  SearchMode,
  WorkspaceView,
} from "@/lib/types";

const VIEW_META: Record<WorkspaceView, { kicker: string; title: string }> = {
  observatory: { kicker: "Observation queue", title: "Live pointing" },
  images: { kicker: "Image library", title: "Recent captures" },
  fits: { kicker: "FITS archive", title: "Raw observations" },
};

const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export default function Home() {
  const [status, setStatus] = useState("Ready to explore");
  const onLibraryError = useCallback((message: string) => setStatus(message), []);
  const { imageFiles, fitsFiles, refresh } = useLibrary(onLibraryError);
  const { progress, running: processing, run } = useProcessJob();

  const [activeView, setActiveView] = useState<WorkspaceView>("observatory");
  const [searchMode, setSearchMode] = useState<SearchMode>("object");
  const [query, setQuery] = useState("");
  const [searchRadius, setSearchRadius] = useState("0.02");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [renderStyle, setRenderStyle] = useState<RenderStyle>("clean");

  const [colorChannels, setColorChannels] = useState<ColorChannels>({ red: "", green: "", blue: "" });
  const [colorLoading, setColorLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<LibraryFile | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [captionLoading, setCaptionLoading] = useState(false);

  /** `RA, DEC` is only meaningful in coordinate mode, but the API takes both. */
  const searchRequest = () => {
    const [ra, dec] = query.split(",").map((value) => Number(value.trim()));
    return { mode: searchMode, query: query.trim(), radius: Number(searchRadius), ra, dec };
  };

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setObservations([]);
    setSelectedObservations([]);
    setStatus("Querying MAST...");
    try {
      const data = await postJson<{ observations?: Observation[] }>(
        "/api/search",
        searchRequest(),
        "Search failed",
      );
      const found = data.observations ?? [];
      setObservations(found);
      setStatus(`${found.length} HST observations found`);
    } catch (error) {
      setStatus(errorMessage(error, "Search failed"));
    } finally {
      setSearched(true);
      setSearching(false);
    }
  };

  const processSelected = async () => {
    if (!selectedObservations.length) return;
    try {
      const final = await run({
        url: "/api/process",
        body: { ...searchRequest(), renderStyle, observationIds: selectedObservations },
        seed: {
          state: "queued",
          stage: "search",
          message: `Starting download and processing job for ${selectedObservations.length} observation(s)...`,
          downloadPercent: 0,
          processingPercent: 0,
          filesFound: 0,
          filesProcessed: 0,
          totalFiles: 0,
        },
        onProgress: (next) => setStatus(next.message),
      });
      await refresh();
      setActiveView("images");
      setStatus(`${final.processed ?? "New"} PNG previews ready`);
    } catch (error) {
      setStatus(errorMessage(error, "Processing failed"));
    }
  };

  const reprocessFits = async () => {
    if (!selectedFits.length) return;
    try {
      const final = await run({
        url: "/api/reprocess",
        body: { paths: selectedFits, renderStyle },
        pollMs: 500,
        seed: {
          state: "queued",
          stage: "processing",
          message: "Starting local FITS reprocessing...",
          downloadPercent: 100,
          processingPercent: 0,
          filesFound: selectedFits.length,
          filesProcessed: 0,
          totalFiles: selectedFits.length,
        },
        onProgress: (next) => setStatus(next.message),
      });
      await refresh();
      setSelectedFits([]);
      setActiveView("images");
      setStatus(`${final.processed ?? "New"} local PNG previews ready`);
    } catch (error) {
      setStatus(errorMessage(error, "Reprocessing failed"));
    }
  };

  const createColorComposite = async () => {
    if (!colorChannels.red || !colorChannels.green || !colorChannels.blue) {
      setStatus("Choose a FITS file for every RGB channel");
      return;
    }
    setColorLoading(true);
    setStatus("Combining filter bands into an RGB color image...");
    try {
      const data = await postJson<{ path: string }>(
        "/api/color-composite",
        colorChannels,
        "Could not create the color composite",
      );
      await refresh();
      setActiveView("images");
      setStatus(`Color composite ready: ${data.path.split("/").pop()}`);
    } catch (error) {
      setStatus(errorMessage(error, "Could not create the color composite"));
    } finally {
      setColorLoading(false);
    }
  };

  const autoFillColorChannels = async () => {
    setColorLoading(true);
    setStatus("Finding compatible FITS filter bands...");
    try {
      const channels = await getJson<ColorChannels>(
        "/api/color-suggestion",
        "Could not find compatible filter bands",
      );
      setColorChannels(channels);
      setStatus("Suggested RGB bands loaded. Review them, then create the color PNG.");
    } catch (error) {
      setStatus(errorMessage(error, "Could not find compatible filter bands"));
    } finally {
      setColorLoading(false);
    }
  };

  const generateCaption = async (file: LibraryFile) => {
    setCaptionLoading(true);
    try {
      setCaption(
        await postJson<Caption>("/api/caption", { path: file.path }, "Could not generate post"),
      );
    } catch (error) {
      setStatus(errorMessage(error, "Could not generate post"));
    } finally {
      setCaptionLoading(false);
    }
  };

  const openLocalFile = async (file: LibraryFile) => {
    try {
      await postJson("/api/open-file", { path: file.path }, "Could not open local file");
      setStatus(`Opened ${file.name} in the local file viewer`);
    } catch (error) {
      setStatus(errorMessage(error, "Could not open local file"));
    }
  };

  const meta = VIEW_META[activeView];
  const visibleCount =
    activeView === "fits" ? fitsFiles.length : activeView === "images" ? imageFiles.length : observations.length;

  return (
    <main className="shell">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        imageCount={imageFiles.length}
        fitsCount={fitsFiles.length}
      />

      <div className="content">
        <TopBar />

        <div className="workspace">
          <SearchPanel
            mode={searchMode}
            onModeChange={setSearchMode}
            query={query}
            onQueryChange={setQuery}
            radius={searchRadius}
            onRadiusChange={setSearchRadius}
            onSubmit={submitSearch}
            searching={searching}
            status={status}
            busy={searching || processing || colorLoading}
          />

          <section className="workspace__main" aria-label={meta.title}>
            <div className="section-heading">
              <div>
                <p className="kicker">{meta.kicker}</p>
                <h2>{meta.title}</h2>
              </div>
              <span className="section-heading__count">
                {visibleCount} {activeView === "observatory" ? "results" : "files"}
              </span>
            </div>

            {activeView === "observatory" && (
              <ObservatoryView
                query={query}
                mode={searchMode}
                observations={observations}
                selected={selectedObservations}
                onToggle={(obsId) => setSelectedObservations((current) => toggle(current, obsId))}
                onToggleAll={() =>
                  setSelectedObservations((current) =>
                    current.length === observations.length
                      ? []
                      : observations.map((observation) => observation.obs_id),
                  )
                }
                onProcess={processSelected}
                processing={processing}
                progress={progress}
                renderStyle={renderStyle}
                onRenderStyleChange={setRenderStyle}
                searched={searched}
              />
            )}

            {activeView === "images" && (
              <ImagesView
                files={imageFiles}
                processing={processing}
                progress={progress}
                observationCount={selectedObservations.length}
                onOpen={setSelectedFile}
                onGenerateCaption={generateCaption}
                onOpenLocalFile={openLocalFile}
                captionLoading={captionLoading}
              />
            )}

            {activeView === "fits" && (
              <FitsView
                files={fitsFiles}
                selected={selectedFits}
                onToggle={(path) => setSelectedFits((current) => toggle(current, path))}
                onToggleAll={() =>
                  setSelectedFits((current) =>
                    current.length === fitsFiles.length ? [] : fitsFiles.map((file) => file.path),
                  )
                }
                onReprocess={reprocessFits}
                processing={processing}
                progress={progress}
                renderStyle={renderStyle}
                onRenderStyleChange={setRenderStyle}
                channels={colorChannels}
                onChannelsChange={setColorChannels}
                onAutoFill={autoFillColorChannels}
                onCompose={createColorComposite}
                colorLoading={colorLoading}
              />
            )}

            {activeView !== "fits" && (
              <button type="button" className="archive-link" onClick={() => setActiveView("fits")}>
                <span className="archive-link__body">
                  <span className="archive-link__icon" aria-hidden="true">▧</span>
                  <span>
                    <strong>Raw FITS archive</strong>
                    <small>
                      {fitsFiles.length
                        ? `${fitsFiles.length} files available locally`
                        : "No FITS products indexed yet"}
                    </small>
                  </span>
                </span>
                <span className="archive-link__arrow" aria-hidden="true">→</span>
              </button>
            )}
          </section>
        </div>

        <footer className="footer">
          <span>Hubble data processor</span>
          <span>Astropy / Astroquery / MAST</span>
          <span>All systems nominal</span>
        </footer>
      </div>

      {selectedFile && <Lightbox file={selectedFile} onClose={() => setSelectedFile(null)} />}
      {caption && <CaptionDialog caption={caption} onClose={() => setCaption(null)} />}
    </main>
  );
}
