"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import * as THREE from "three";

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

type ProcessProgress = {
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

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

function HubbleScene({ target, mode }: { target: string; mode: "object" | "coordinates" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#17221f");
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(4.6, 2.9, 5.8);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);
    scene.add(new THREE.AmbientLight(0x9fb7b0, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffe1bd, 3);
    keyLight.position.set(4, 5, 3);
    scene.add(keyLight);
    const telescope = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xd6ddd2, roughness: 0.7, metalness: 0.15 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x263a38, roughness: 0.55, metalness: 0.4 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc99a54, roughness: 0.55, metalness: 0.25 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.7, 32), metal);
    body.rotation.z = Math.PI / 2;
    telescope.add(body);
    const front = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.2, 32), darkMetal);
    front.rotation.z = Math.PI / 2;
    front.position.x = 1.38;
    telescope.add(front);
    const aperture = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32), new THREE.MeshStandardMaterial({ color: 0x081210, roughness: 0.2, metalness: 0.8 }));
    aperture.rotation.y = Math.PI / 2;
    aperture.position.x = 1.5;
    telescope.add(aperture);
    for (const y of [-1.35, 1.35]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.75), new THREE.MeshStandardMaterial({ color: 0x385d70, roughness: 0.45, metalness: 0.35 }));
      panel.position.y = y;
      telescope.add(panel);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.12, 0.84), gold);
      frame.position.set(0, y, 0);
      frame.scale.z = 0.06;
      telescope.add(frame);
    }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal);
    dish.position.set(-1.5, 0, 0);
    dish.rotation.z = -Math.PI / 2;
    telescope.add(dish);
    const raDec = target.split(",").map((value) => Number(value.trim()));
    const seed = [...target].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const ra = mode === "coordinates" && Number.isFinite(raDec[0]) ? raDec[0] : seed % 360;
    const dec = mode === "coordinates" && Number.isFinite(raDec[1]) ? raDec[1] : ((seed % 120) - 60);
    telescope.rotation.y = THREE.MathUtils.degToRad(ra);
    telescope.rotation.z = THREE.MathUtils.degToRad(-dec);
    scene.add(telescope);
    const targetMarker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), new THREE.MeshBasicMaterial({ color: 0xe06b45 }));
    targetMarker.position.set(2.3, 1.2, -2.6);
    scene.add(targetMarker);
    const starField = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xd9e8df, size: 0.025 }));
    const stars = new Float32Array(240);
    for (let index = 0; index < stars.length; index += 3) { stars[index] = (seed * (index + 3) % 100) / 10 - 5; stars[index + 1] = (seed * (index + 7) % 80) / 10 - 4; stars[index + 2] = (seed * (index + 11) % 100) / 10 - 5; }
    starField.geometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    scene.add(starField);
    let frameId = 0;
    const animate = () => { frameId = requestAnimationFrame(animate); telescope.rotation.x += 0.0015; renderer.render(scene, camera); };
    animate();
    return () => { cancelAnimationFrame(frameId); window.removeEventListener("resize", resize); renderer.dispose(); scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose(); } }); };
  }, [mode, target]);

  return <div className="hubble-scene"><canvas ref={canvasRef} /><div className="scene-readout"><span>POINTING VECTOR</span><strong>{target.trim() || "Awaiting target"}</strong><small>{mode === "coordinates" ? "RA / DEC reference" : "Resolved target reference"}</small></div><div className="scene-crosshair">+</div></div>;
}

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
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [renderStyle, setRenderStyle] = useState<"clean" | "graph">("clean");
  const [processProgress, setProcessProgress] = useState<ProcessProgress | null>(null);
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
    setProcessProgress({ state: "queued", stage: "search", message: `Starting download and processing job for ${selectedObservations.length} observation(s)...`, downloadPercent: 0, processingPercent: 0, filesFound: 0, filesProcessed: 0, totalFiles: 0 });
    setStatus("Starting processing job...");
    const [ra, dec] = query.split(",").map((value) => Number(value.trim()));
    const request: SearchRequest = { mode: searchMode, query: query.trim(), radius: Number(searchRadius), ra, dec };
    try {
      const response = await fetch("/api/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...request, renderStyle, observationIds: selectedObservations }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Processing failed");
      let finished = false;
      let finalProgress: ProcessProgress | null = null;
      while (!finished) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const progressResponse = await fetch(`/api/process/${data.jobId}`);
        const progress: ProcessProgress = await progressResponse.json();
        finalProgress = progress;
        setProcessProgress(progress);
        setStatus(progress.message);
        if (progress.state === "error") throw new Error(progress.error ?? progress.message);
        finished = progress.state === "complete";
      }
      const libraryResponse = await fetch("/api/library");
      const libraryData = await libraryResponse.json();
      setFiles(libraryData.files ?? []);
      setActiveView("images");
      setStatus(`${finalProgress?.processed ?? "New"} PNG previews ready`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const toggleFits = (filePath: string) => {
    setSelectedFits((current) => current.includes(filePath) ? current.filter((item) => item !== filePath) : [...current, filePath]);
  };

  const reprocessFits = async () => {
    if (!selectedFits.length) return;
    setProcessing(true);
    setProcessProgress({ state: "queued", stage: "processing", message: "Starting local FITS reprocessing...", downloadPercent: 100, processingPercent: 0, filesFound: selectedFits.length, filesProcessed: 0, totalFiles: selectedFits.length });
    setStatus("Starting local FITS reprocessing...");
    try {
      const response = await fetch("/api/reprocess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: selectedFits, renderStyle }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Reprocessing failed");
      let finished = false;
      let finalProgress: ProcessProgress | null = null;
      while (!finished) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const progressResponse = await fetch(`/api/process/${data.jobId}`);
        const progress: ProcessProgress = await progressResponse.json();
        finalProgress = progress;
        setProcessProgress(progress);
        setStatus(progress.message);
        if (progress.state === "error") throw new Error(progress.error ?? progress.message);
        finished = progress.state === "complete";
      }
      const libraryResponse = await fetch("/api/library");
      const libraryData = await libraryResponse.json();
      setFiles(libraryData.files ?? []);
      setSelectedFits([]);
      setActiveView("images");
      setStatus(`${finalProgress?.processed ?? "New"} local PNG previews ready`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Reprocessing failed");
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

  const openLocalFile = async (file: LibraryFile) => {
    try {
      const response = await fetch("/api/open-file", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: file.path }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open local file");
      setStatus(`Opened ${file.name} in the local file viewer`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not open local file");
    }
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
            {activeView === "observatory" && <><HubbleScene target={query} mode={searchMode} />{processProgress && processing && <div className="progress-panel observatory-progress"><div className="progress-message"><span className="progress-spinner" />{processProgress.message}</div><div className="progress-line"><div><span>DOWNLOADS</span><strong>{processProgress.downloadPercent}%</strong></div><div className="progress-track"><i style={{ width: `${processProgress.downloadPercent}%` }} /></div><small>{processProgress.filesFound ? `${processProgress.filesFound} FITS product(s) found` : `Estimating products for ${selectedObservations.length} observation(s)...`}</small></div><div className="progress-line"><div><span>IMAGE PROCESSING</span><strong>{processProgress.processingPercent}%</strong></div><div className="progress-track"><i style={{ width: `${processProgress.processingPercent}%` }} /></div><small>{processProgress.totalFiles ? `${processProgress.filesProcessed} of ${processProgress.totalFiles} PNG previews created` : "Waiting for downloads..."}</small></div></div>}</>}
            {processProgress && processing && activeView === "images" && <div className="progress-panel progress-panel-shared"><div className="progress-message"><span className="progress-spinner" />{processProgress.message}</div><div className="progress-line"><div><span>{processProgress.stage === "processing" && processProgress.downloadPercent === 100 ? "LOCAL FITS" : "DOWNLOADS"}</span><strong>{processProgress.stage === "processing" && processProgress.downloadPercent === 100 ? "READY" : `${processProgress.downloadPercent}%`}</strong></div><div className="progress-track"><i style={{ width: `${processProgress.downloadPercent}%` }} /></div><small>{processProgress.filesFound ? `${processProgress.filesFound} file(s) found` : "Estimating products..."}</small></div><div className="progress-line"><div><span>IMAGE PROCESSING</span><strong>{processProgress.processingPercent}%</strong></div><div className="progress-track"><i style={{ width: `${processProgress.processingPercent}%` }} /></div><small>{processProgress.totalFiles ? `${processProgress.filesProcessed} of ${processProgress.totalFiles} PNG previews created` : "Waiting for downloads..."}</small></div></div>}
            {activeView === "observatory" && observations.length > 0 && <><div className="result-toolbar"><span>{selectedObservations.length} selected</span><button onClick={() => setSelectedObservations(selectedObservations.length === observations.length ? [] : observations.map((observation) => observation.obs_id))}>{selectedObservations.length === observations.length ? "Clear selection" : "Select all"}</button><button className="process-button" disabled={!selectedObservations.length || processing} onClick={processSelected}>{processing ? "Processing..." : "Download & process"} <span>↗</span></button></div><div className="render-options"><span>OUTPUT STYLE</span><button className={renderStyle === "clean" ? "selected" : ""} onClick={() => setRenderStyle("clean")} disabled={processing}>Clean image <small>No graph</small></button><button className={renderStyle === "graph" ? "selected" : ""} onClick={() => setRenderStyle("graph")} disabled={processing}>Scientific graph <small>Axes + metadata</small></button></div>{processProgress && processing && <div className="progress-panel"><div className="progress-message"><span className="progress-spinner" />{processProgress.message}</div><div className="progress-line"><div><span>DOWNLOADS</span><strong>{processProgress.downloadPercent}%</strong></div><div className="progress-track"><i style={{ width: `${processProgress.downloadPercent}%` }} /></div><small>{processProgress.filesFound ? `${processProgress.filesFound} FITS product(s) found` : "Finding science products..."}</small></div><div className="progress-line"><div><span>IMAGE PROCESSING</span><strong>{processProgress.processingPercent}%</strong></div><div className="progress-track"><i style={{ width: `${processProgress.processingPercent}%` }} /></div><small>{processProgress.totalFiles ? `${processProgress.filesProcessed} of ${processProgress.totalFiles} PNG previews created` : "Waiting for downloads..."}</small></div></div>}<div className="observation-list">{observations.map((observation) => <label className={`observation-row ${selectedObservations.includes(observation.obs_id) ? "checked" : ""}`} key={observation.obs_id}><input type="checkbox" checked={selectedObservations.includes(observation.obs_id)} onChange={() => toggleObservation(observation.obs_id)} /><strong>{observation.obs_id}</strong><span>{observation.target_name} · {observation.instrument_name}</span><small>{observation.filters || "Filter unavailable"} · {observation.t_exptime || "Exposure unavailable"} s</small></label>)}</div></>}
            {activeView === "images" && (imageFiles.length ? <div className="image-grid">{imageFiles.map((file) => <div className="image-card" key={file.path}><button className="image-open" onClick={() => setSelectedFile(file)}><div className="image-preview"><img src={`/api/file?path=${encodeURIComponent(file.path)}`} alt={file.name} /><span>VIEW ↗</span></div><div className="image-meta"><strong>{file.name}</strong><small>{formatBytes(file.size)} <i /> PNG</small></div></button><div className="image-actions"><button className="caption-button" onClick={() => generateCaption(file)} disabled={captionLoading}>✎ {captionLoading ? "Writing..." : "Generate post"}</button><button className="local-file-button" onClick={() => openLocalFile(file)}>⌂ Open local file</button></div></div>)}</div> : <div className="empty-state"><div className="empty-icon">⊹</div><h4>Your image library is quiet.</h4><p>Processed PNG previews will appear here after you run a download and image processing pass from the Python tool.</p><div className="path-chip">/hubble_images/**/*.png</div></div>)}
            {activeView === "fits" && <><div className="render-options"><span>OUTPUT STYLE</span><button className={renderStyle === "clean" ? "selected" : ""} onClick={() => setRenderStyle("clean")} disabled={processing}>Clean image <small>No graph</small></button><button className={renderStyle === "graph" ? "selected" : ""} onClick={() => setRenderStyle("graph")} disabled={processing}>Scientific graph <small>Axes + metadata</small></button></div><div className="fits-toolbar"><span>{selectedFits.length} selected</span><button onClick={() => setSelectedFits(selectedFits.length === fitsFiles.length ? [] : fitsFiles.map((file) => file.path))}>{selectedFits.length === fitsFiles.length ? "Clear selection" : "Select all"}</button><button className="process-button" disabled={!selectedFits.length || processing} onClick={reprocessFits}>{processing ? "Processing..." : "Reprocess selected"} <span>↗</span></button></div>{processProgress && processing && <div className="progress-panel"><div className="progress-message"><span className="progress-spinner" />{processProgress.message}</div><div className="progress-line"><div><span>LOCAL FITS</span><strong>{processProgress.downloadPercent}%</strong></div><div className="progress-track"><i style={{ width: "100%" }} /></div><small>{processProgress.filesFound} existing FITS file(s) selected</small></div><div className="progress-line"><div><span>IMAGE PROCESSING</span><strong>{processProgress.processingPercent}%</strong></div><div className="progress-track"><i style={{ width: `${processProgress.processingPercent}%` }} /></div><small>{processProgress.totalFiles ? `${processProgress.filesProcessed} of ${processProgress.totalFiles} PNG previews created` : "Waiting to process..."}</small></div></div>}<div className="fits-list">{fitsFiles.map((file) => <label className={`fits-row ${selectedFits.includes(file.path) ? "checked" : ""}`} key={file.path}><input type="checkbox" checked={selectedFits.includes(file.path)} onChange={() => toggleFits(file.path)} /><span>▧</span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></label>)}</div></>}
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
