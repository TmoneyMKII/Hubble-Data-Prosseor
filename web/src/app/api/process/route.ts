import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createJob, updateJob } from "./job-store";

const projectRoot = path.resolve(process.cwd(), "..");
const processScript = `
import contextlib, io, json, sys
import matplotlib
matplotlib.use("Agg")
from space_telescope_processor import SpaceTelescopeDataProcessor

def progress(stage, message, **values):
  print(json.dumps({"stage": stage, "message": message, **values}), flush=True)

mode, query, radius = sys.argv[1], sys.argv[2], float(sys.argv[3])
selected_ids = set(json.loads(sys.argv[6]))
render_style = sys.argv[7] if sys.argv[7] in ("clean", "graph") else "graph"
processor = SpaceTelescopeDataProcessor()
progress("search", f"Re-checking selected observations for {render_style} output with MAST...")
with contextlib.redirect_stdout(io.StringIO()):
    table = processor.search_by_object(query, radius) if mode == "object" else processor.search_by_coordinates(float(sys.argv[4]), float(sys.argv[5]), radius)
if table is None:
    progress("complete", "No observations were returned.", processed=0)
    raise SystemExit
indices = [index for index, row in enumerate(table) if str(row["obs_id"]) in selected_ids]
if not indices:
    progress("complete", "The selected observations are no longer available.", processed=0)
    raise SystemExit
progress("download", f"Finding science products for {len(indices)} observation(s)...", downloadPercent=10)
with contextlib.redirect_stdout(io.StringIO()):
    data_products = processor.download_products.__globals__["Observations"].get_product_list(table[indices])
    science_products = processor.download_products.__globals__["Observations"].filter_products(data_products, productType="SCIENCE", extension="fits")
progress("download", f"Downloading {len(science_products)} FITS science product(s)...", downloadPercent=20, totalFiles=len(science_products), filesFound=len(science_products))
with contextlib.redirect_stdout(io.StringIO()):
    manifest = processor.download_products.__globals__["Observations"].download_products(science_products, download_dir=str(processor.output_dir))
paths = [path for path in processor._collect_downloaded_files(manifest) if path.lower().endswith(".fits")]
progress("download", f"Download complete. {len(paths)} FITS file(s) are ready.", downloadPercent=100, totalFiles=len(paths), filesFound=len(paths))
processed = []
for index, file_path in enumerate(paths, 1):
    progress("processing", f"Rendering {index} of {len(paths)}: {file_path.rsplit("/", 1)[-1]}", processingPercent=round((index - 1) / len(paths) * 100), filesProcessed=index - 1, totalFiles=len(paths))
    with contextlib.redirect_stdout(io.StringIO()):
        processor.process_and_display_image(file_path, save_png=True, render_style=render_style)
    output_suffix = "_clean.png" if render_style == "clean" else ".png"
    processed.append(file_path.rsplit(".", 1)[0].removesuffix("_clean") + output_suffix)
    progress("processing", f"Created {render_style} preview {index} of {len(paths)}.", processingPercent=round(index / len(paths) * 100), filesProcessed=index, totalFiles=len(paths))
progress("complete", f"Finished {len(processed)} PNG preview(s).", processingPercent=100, filesProcessed=len(processed), totalFiles=len(paths), processed=len(processed))
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const observationIds = Array.isArray(body.observationIds) ? body.observationIds.filter((id: unknown) => typeof id === "string") : [];
    if (!observationIds.length) return NextResponse.json({ error: "Select at least one observation" }, { status: 400 });
    const radius = Number(body.radius);
    if (!Number.isFinite(radius) || radius <= 0) return NextResponse.json({ error: "Search radius must be positive" }, { status: 400 });
    const job = createJob();
    const renderStyle = body.renderStyle === "clean" ? "clean" : "graph";
    const args = ["-c", processScript, body.mode === "object" ? "object" : "coordinates", String(body.query ?? ""), String(radius), String(body.ra ?? ""), String(body.dec ?? ""), JSON.stringify(observationIds), renderStyle];
    const child = spawn("python", args, { cwd: projectRoot });
    let output = "";
    updateJob(job.id, { state: "running", message: "Starting Python worker..." });
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const lines = output.split("\n");
      output = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          updateJob(job.id, { stage: event.stage, message: event.message, downloadPercent: event.downloadPercent ?? job.downloadPercent, processingPercent: event.processingPercent ?? job.processingPercent, filesFound: event.filesFound ?? job.filesFound, filesProcessed: event.filesProcessed ?? job.filesProcessed, totalFiles: event.totalFiles ?? job.totalFiles, processed: event.processed ?? job.processed, state: event.stage === "complete" ? "complete" : "running" });
        } catch { /* Ignore dependency output that is not progress JSON. */ }
      }
    });
    child.stderr.on("data", () => undefined);
    child.on("error", (error) => updateJob(job.id, { state: "error", stage: "error", message: "Python worker could not start.", error: error.message }));
    child.on("close", (code) => { if (code !== 0) updateJob(job.id, { state: "error", stage: "error", message: "The Python worker stopped before processing finished.", error: "Python process exited unexpectedly." }); });
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Could not start processing" }, { status: 500 });
  }
}