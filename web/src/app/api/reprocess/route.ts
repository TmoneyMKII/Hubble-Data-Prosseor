import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createJob, updateJob } from "../process/job-store";

const projectRoot = path.resolve(process.cwd(), "..");
const libraryRoot = path.resolve(projectRoot, "hubble_images");
const reprocessScript = `
import contextlib, io, json, sys
import matplotlib
matplotlib.use("Agg")
from space_telescope_processor import SpaceTelescopeDataProcessor

def progress(message, **values):
    print(json.dumps({"stage": "processing", "message": message, **values}), flush=True)

paths = json.loads(sys.argv[1])
render_style = sys.argv[2] if sys.argv[2] in ("clean", "graph") else "graph"
processor = SpaceTelescopeDataProcessor()
processed = []
for index, file_path in enumerate(paths, 1):
    progress(f"Rendering local FITS {index} of {len(paths)}: {file_path.rsplit("/", 1)[-1]}", processingPercent=round((index - 1) / len(paths) * 100), filesFound=len(paths), filesProcessed=index - 1, totalFiles=len(paths), downloadPercent=100)
    with contextlib.redirect_stdout(io.StringIO()):
        processor.process_and_display_image(file_path, save_png=True, render_style=render_style)
    processed.append(file_path)
    progress(f"Created {render_style} preview {index} of {len(paths)}.", processingPercent=round(index / len(paths) * 100), filesFound=len(paths), filesProcessed=index, totalFiles=len(paths), downloadPercent=100)
print(json.dumps({"stage": "complete", "message": f"Finished {len(processed)} local preview(s).", "processingPercent": 100, "filesFound": len(paths), "filesProcessed": len(processed), "totalFiles": len(paths), "downloadPercent": 100, "processed": len(processed)}), flush=True)
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestedPaths = Array.isArray(body.paths) ? body.paths.filter((item: unknown) => typeof item === "string") : [];
    const paths = requestedPaths.map((item: string) => path.resolve(libraryRoot, item));
    if (!paths.length || paths.some((filePath: string) => !filePath.startsWith(`${libraryRoot}${path.sep}`) || path.extname(filePath).toLowerCase() !== ".fits")) return NextResponse.json({ error: "Select valid local FITS files" }, { status: 400 });
    const job = createJob();
    const style = body.renderStyle === "clean" ? "clean" : "graph";
    const child = spawn("python", ["-c", reprocessScript, JSON.stringify(paths), style], { cwd: projectRoot });
    let output = "";
    updateJob(job.id, { state: "running", stage: "processing", message: "Starting local FITS renderer...", totalFiles: paths.length, filesFound: paths.length, downloadPercent: 100 });
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const lines = output.split("\n");
      output = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          updateJob(job.id, { state: event.stage === "complete" ? "complete" : "running", stage: event.stage, message: event.message, downloadPercent: event.downloadPercent ?? 100, processingPercent: event.processingPercent ?? 0, filesFound: event.filesFound ?? paths.length, filesProcessed: event.filesProcessed ?? 0, totalFiles: event.totalFiles ?? paths.length, processed: event.processed ?? job.processed });
        } catch { /* Ignore non-progress output. */ }
      }
    });
    child.on("error", (error) => updateJob(job.id, { state: "error", stage: "error", message: "Python renderer could not start.", error: error.message }));
    child.on("close", (code) => { if (code !== 0) updateJob(job.id, { state: "error", stage: "error", message: "The local FITS renderer stopped unexpectedly.", error: "Python process exited unexpectedly." }); });
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Could not start local FITS reprocessing" }, { status: 500 });
  }
}