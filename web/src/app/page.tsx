"use client";

import { FormEvent, useEffect, useState } from "react";

type LibraryFile = {
  name: string;
  path: string;
  type: "image" | "fits";
  size: number;
  modified: string;
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
  const [searchMode, setSearchMode] = useState<"object" | "coordinates">("object");
  const [status, setStatus] = useState("Ready to explore");
  const [selectedFile, setSelectedFile] = useState<LibraryFile | null>(null);

  useEffect(() => {
    fetch("/api/library")
      .then((response) => response.json())
      .then((data) => setFiles(data.files ?? []))
      .catch(() => setStatus("Could not read local library"));
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus(`Search queued for ${searchMode === "object" ? `'${query.trim()}'` : query.trim()}`);
  };

  const imageFiles = files.filter((file) => file.type === "image");
  const fitsFiles = files.filter((file) => file.type === "fits");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>HUBBLE<span className="brand-muted">.LOCAL</span></span></div>
        <div className="side-label">Workspace</div>
        <nav>
          <button className="nav-item active"><span>◈</span> Observatory</button>
          <button className="nav-item"><span>⌁</span> Image library <b>{imageFiles.length}</b></button>
          <button className="nav-item"><span>▦</span> FITS archive <b>{fitsFiles.length}</b></button>
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
              <label>Search radius <input defaultValue="0.02" /></label>
              <button className="search-button" type="submit">Launch query <span>↗</span></button>
            </form>
            <div className="search-status"><span className="status-dot" /> {status}</div>
          </section>

          <section className="library-panel">
            <div className="section-heading"><div><div className="panel-kicker">LOCAL LIBRARY</div><h3>Recent captures</h3></div><span className="file-count">{files.length} FILES</span></div>
            {imageFiles.length ? <div className="image-grid">{imageFiles.map((file) => <button className="image-card" key={file.path} onClick={() => setSelectedFile(file)}><div className="image-preview"><img src={`/api/file?path=${encodeURIComponent(file.path)}`} alt={file.name} /><span>VIEW ↗</span></div><div className="image-meta"><strong>{file.name}</strong><small>{formatBytes(file.size)} <i /> PNG</small></div></button>)}</div> : <div className="empty-state"><div className="empty-icon">⊹</div><h4>Your image library is quiet.</h4><p>Processed PNG previews will appear here after you run a download and image processing pass from the Python tool.</p><div className="path-chip">/hubble_images/**/*.png</div></div>}
            <div className="archive-row"><div><span className="archive-icon">▧</span><div><strong>Raw FITS archive</strong><small>{fitsFiles.length ? `${fitsFiles.length} files available locally` : "No FITS products indexed yet"}</small></div></div><span className="arrow">→</span></div>
          </section>
        </div>
        <footer><span>HUBBLE DATA PROCESSOR</span><span>ASTROPY / ASTROQUERY / MAST</span><span>ALL SYSTEMS NOMINAL</span></footer>
      </section>

      {selectedFile && <div className="lightbox" onClick={() => setSelectedFile(null)}><div className="lightbox-content" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setSelectedFile(null)}>×</button><img src={`/api/file?path=${encodeURIComponent(selectedFile.path)}`} alt={selectedFile.name} /><div><strong>{selectedFile.name}</strong><span>{formatBytes(selectedFile.size)} · local capture</span></div></div></div>}
    </main>
  );
}
