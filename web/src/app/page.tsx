"use client";

import { FormEvent, useEffect, useState } from "react";

type LibraryFile = {
  name: string;
  path: string;
  type: "image" | "fits";
  size: number;
  modified: string;
};

type Observation = {
  obs_id: string;
  target_name: string;
  instrument_name: string;
  filters: string;
  t_exptime: string;
};

type SearchRequest = {
  mode: "object" | "coordinates";
  query: string;
  radius: number;
  ra?: number;
  dec?: number;
};

type Caption = {
  title: string;
  text: string;
  target: string;
  instrument: string;
  filter: string;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

export default function Home() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [query, setQuery] = useState("");
  const [searchRadius, setSearchRadius] = useState("0.02");
  const [searchMode, setSearchMode] = useState<"object" | "coordinates">("object");
  const [status, setStatus] = useState("Ready to explore");
  const [selectedFile, setSelectedFile] = useState<LibraryFile | null>(null);
  const [activeView, setActiveView] = useState<"observatory" | "images" | "fits">("observatory");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/library")
      .then((response) => response.json())
      .then((data) => setFiles(data.files ?? []))
      .catch(() => setStatus("Could not read local library"));
  }, []);

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setObservations([]);
    setStatus("Querying MAST...");
    const [ra, dec] = query.split(",").map((value) => Number(value.trim()));
    const radius = Number(searchRadius);
    try {
      const response = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: searchMode, query: query.trim(), ra, dec, radius }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search failed");
      setObservations(data.observations ?? []);
      setSelectedObservations([]);
      setStatus(`${data.observations?.length ?? 0} HST observations found`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const toggleObservation = (obsId: string) => {
    setSelectedObservations((current) => current.includes(obsId) ? current.filter((id) => id !== obsId) : [...current, obsId]);
  };

  const processSelected = async () => {
    if (!selectedObservations.length) return;
    setProcessing(true);
    setStatus("Downloading FITS products and creating PNG previews...");
    const [ra, dec] = query.split(",").map((value) => Number(value.trim()));
    const request: SearchRequest = { mode: searchMode, query: query.trim(), radius: Number(searchRadius), ra, dec };
    try {
      const response = await fetch("/api/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...request, observationIds: selectedObservations }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Processing failed");
      const libraryResponse = await fetch("/api/library");
      const libraryData = await libraryResponse.json();
      setFiles(libraryData.files ?? []);
      setActiveView("images");
      setStatus(`${data.processed} PNG preview${data.processed === 1 ? "" : "s"} ready`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const imageFiles = files.filter((file) => file.type === "image");
  const fitsFiles = files.filter((file) => file.type === "fits");

  const generateCaption = async (file: LibraryFile) => {
    setCaptionLoading(true);
    setCopied(false);
    try {
      const response = await fetch("/api/caption", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: file.path }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not generate post");
      setCaption(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not generate post");
    } finally {
      setCaptionLoading(false);
    }
  };

  const copyCaption = async () => {
    if (!caption) return;
    await navigator.clipboard.writeText(caption.text);
    setCopied(true);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>HUBBLE<span className="brand-muted">.LOCAL</span></span></div>
        <div className="side-label">Workspace</div>
        <nav>
          <button className={`nav-item ${activeView === "observatory" ? "active" : ""}`} onClick={() => setActiveView("observatory")}><span>◈</span> Observatory</button>
          <button className={`nav-item ${activeView === "images" ? "active" : ""}`} onClick={() => setActiveView("images")}><span>⌁</span> Image library <b>{imageFiles.length}</b></button>
          <button className={`nav-item ${activeView === "fits" ? "active" : ""}`} onClick={() => setActiveView("fits")}><span>▦</span> FITS archive <b>{fitsFiles.length}</b></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="connection"><span className="pulse" /> Local Python engine <strong>online</strong></div>
          <p className="side-note">MAST data is queried by the existing Python processor. This console watches your local output folder.</p>
          <div className="version">HUBBLE PROCESSOR <span>v0.1</span></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar"><div><span className="eyebrow">CONTROL ROOM / 01</span><h1>Observation desk</h1></div><div className="top-status"><span className="status-dot" /> LOCALHOST <span className="divider" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase()}</div></header>

        <div className="workspace">
          <section className="search-panel">
            <div className="panel-kicker">MAST SEARCH <span>•</span> HST / IMAGE</div>
            <h2>Find a new<br /><em>window</em> into space.</h2>
            <p className="panel-copy">Search the Hubble archive by an object name or a precise point in the sky.</p>
            <div className="mode-switch"><button className={searchMode === "object" ? "selected" : ""} onClick={() => setSearchMode("object")}>Object name</button><button className={searchMode === "coordinates" ? "selected" : ""} onClick={() => setSearchMode("coordinates")}>Coordinates</button></div>
            <form onSubmit={submitSearch} className="search-form">
              <label>{searchMode === "object" ? "Target identifier" : "RA / DEC in degrees"}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchMode === "object" ? "M51, NGC 6302..." : "202.469575, 47.195258"} /></label>
              <label>Search radius <input name="radius" value={searchRadius} onChange={(event) => setSearchRadius(event.target.value)} /></label>
              <button className="search-button" type="submit" disabled={searching}>{searching ? "Querying..." : "Launch query"} <span>↗</span></button>
            </form>
            <div className="search-status"><span className="status-dot" /> {status}</div>
          </section>

          <section className="library-panel">
            <div className="section-heading"><div><div className="panel-kicker">{activeView === "fits" ? "FITS ARCHIVE" : activeView === "images" ? "IMAGE LIBRARY" : "LOCAL LIBRARY"}</div><h3>{activeView === "fits" ? "Raw observations" : "Recent captures"}</h3></div><span className="file-count">{activeView === "fits" ? fitsFiles.length : activeView === "images" ? imageFiles.length : files.length} FILES</span></div>
            {activeView === "observatory" && observations.length > 0 && <><div className="result-toolbar"><span>{selectedObservations.length} selected</span><button onClick={() => setSelectedObservations(selectedObservations.length === observations.length ? [] : observations.map((observation) => observation.obs_id))}>{selectedObservations.length === observations.length ? "Clear selection" : "Select all"}</button><button className="process-button" disabled={!selectedObservations.length || processing} onClick={processSelected}>{processing ? "Processing..." : "Download & process"} <span>↗</span></button></div><div className="observation-list">{observations.map((observation) => <label className={`observation-row ${selectedObservations.includes(observation.obs_id) ? "checked" : ""}`} key={observation.obs_id}><input type="checkbox" checked={selectedObservations.includes(observation.obs_id)} onChange={() => toggleObservation(observation.obs_id)} /><strong>{observation.obs_id}</strong><span>{observation.target_name} · {observation.instrument_name}</span><small>{observation.filters || "Filter unavailable"} · {observation.t_exptime || "Exposure unavailable"} s</small></label>)}</div></>}
            {activeView !== "fits" && (imageFiles.length ? <div className="image-grid">{imageFiles.map((file) => <div className="image-card" key={file.path}><button className="image-open" onClick={() => setSelectedFile(file)}><div className="image-preview"><img src={`/api/file?path=${encodeURIComponent(file.path)}`} alt={file.name} /><span>VIEW ↗</span></div><div className="image-meta"><strong>{file.name}</strong><small>{formatBytes(file.size)} <i /> PNG</small></div></button><button className="caption-button" onClick={() => generateCaption(file)} disabled={captionLoading}>✎ {captionLoading ? "Writing..." : "Generate post"}</button></div>)}</div> : <div className="empty-state"><div className="empty-icon">⊹</div><h4>Your image library is quiet.</h4><p>Processed PNG previews will appear here after you run a download and image processing pass from the Python tool.</p><div className="path-chip">/hubble_images/**/*.png</div></div>)}
            {activeView === "fits" && <div className="fits-list">{fitsFiles.map((file) => <div key={file.path}><span>▧</span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></div>)}</div>}
            {activeView !== "fits" && <div className="archive-row" onClick={() => setActiveView("fits")}><div><span className="archive-icon">▧</span><div><strong>Raw FITS archive</strong><small>{fitsFiles.length ? `${fitsFiles.length} files available locally` : "No FITS products indexed yet"}</small></div></div><span className="arrow">→</span></div>}
          </section>
        </div>
        <footer><span>HUBBLE DATA PROCESSOR</span><span>ASTROPY / ASTROQUERY / MAST</span><span>ALL SYSTEMS NOMINAL</span></footer>
      </section>

      {selectedFile && <div className="lightbox" onClick={() => setSelectedFile(null)}><div className="lightbox-content" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setSelectedFile(null)}>×</button><img src={`/api/file?path=${encodeURIComponent(selectedFile.path)}`} alt={selectedFile.name} /><div><strong>{selectedFile.name}</strong><span>{formatBytes(selectedFile.size)} · local capture</span></div></div></div>}
      {caption && <div className="caption-modal" onClick={() => setCaption(null)}><section className="caption-dialog" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setCaption(null)}>×</button><div className="panel-kicker">SOCIAL POST GENERATOR</div><h2>{caption.title}</h2><div className="caption-facts"><span>{caption.target}</span><span>{caption.instrument}</span><span>{caption.filter}</span></div><textarea value={caption.text} readOnly aria-label="Generated social media post" /><div className="caption-actions"><button onClick={copyCaption}>{copied ? "Copied" : "Copy post"} <span>↗</span></button><small>Ready for Instagram, Threads, Bluesky, or X</small></div></section></div>}
    </main>
  );
}
