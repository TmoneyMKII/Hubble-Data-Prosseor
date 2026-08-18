import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const runPython = promisify(execFile);
const projectRoot = path.resolve(process.cwd(), "..");
const processScript = `
import contextlib, io, json, sys
import matplotlib
matplotlib.use("Agg")
from hubble_processor import HubbleDataProcessor

mode, query, radius = sys.argv[1], sys.argv[2], float(sys.argv[3])
selected_ids = set(json.loads(sys.argv[6]))
processor = HubbleDataProcessor()
with contextlib.redirect_stdout(io.StringIO()):
    table = processor.search_by_object(query, radius) if mode == "object" else processor.search_by_coordinates(float(sys.argv[4]), float(sys.argv[5]), radius)
if table is None:
    print(json.dumps({"processed": 0}))
    raise SystemExit
indices = [index for index, row in enumerate(table) if str(row["obs_id"]) in selected_ids]
if not indices:
    print(json.dumps({"processed": 0}))
    raise SystemExit
with contextlib.redirect_stdout(io.StringIO()):
    manifest = processor.download_products(table, indices)
    paths = processor._collect_downloaded_files(manifest)
    processed = []
    for file_path in paths:
        if file_path.lower().endswith(".fits"):
            processor.process_and_display_image(file_path, save_png=True)
            processed.append(file_path.rsplit(".", 1)[0] + ".png")
print(json.dumps({"processed": len(processed), "files": processed}))
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const observationIds = Array.isArray(body.observationIds) ? body.observationIds.filter((id: unknown) => typeof id === "string") : [];
    if (!observationIds.length) return NextResponse.json({ error: "Select at least one observation" }, { status: 400 });
    const radius = Number(body.radius);
    if (!Number.isFinite(radius) || radius <= 0) return NextResponse.json({ error: "Search radius must be positive" }, { status: 400 });
    const args = ["-c", processScript, body.mode === "object" ? "object" : "coordinates", String(body.query ?? ""), String(radius), String(body.ra ?? ""), String(body.dec ?? ""), JSON.stringify(observationIds)];
    const { stdout } = await runPython("python", args, { cwd: projectRoot, maxBuffer: 1024 * 1024 });
    return NextResponse.json(JSON.parse(stdout.trim() || "{}"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    return NextResponse.json({ error: message.includes("No module named") ? "Python dependencies are not installed. Run pip install -r requirements.txt." : "Could not download or process the selected observation." }, { status: 500 });
  }
}