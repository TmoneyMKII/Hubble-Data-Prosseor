import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const runPython = promisify(execFile);
const projectRoot = path.resolve(process.cwd(), "..");
const searchScript = `
import contextlib, io, json, sys
from hubble_processor import HubbleDataProcessor
mode, query, radius = sys.argv[1], sys.argv[2], float(sys.argv[3])
processor = HubbleDataProcessor()
with contextlib.redirect_stdout(io.StringIO()):
    table = processor.search_by_object(query, radius) if mode == "object" else processor.search_by_coordinates(float(sys.argv[4]), float(sys.argv[5]), radius)
rows = []
if table is not None:
    for row in table[:50]:
        rows.append({key: str(row[key]) if row[key] is not None else "" for key in ("obs_id", "target_name", "instrument_name", "filters", "t_exptime") if key in table.colnames})
print(json.dumps(rows))
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const radius = Number(body.radius);
    if (!Number.isFinite(radius) || radius <= 0) return NextResponse.json({ error: "Radius must be a positive number" }, { status: 400 });
    if (body.mode === "coordinates" && (!Number.isFinite(Number(body.ra)) || !Number.isFinite(Number(body.dec)))) return NextResponse.json({ error: "Enter coordinates as RA, DEC in degrees" }, { status: 400 });
    const args = ["-c", searchScript, body.mode === "object" ? "object" : "coordinates", String(body.query ?? ""), String(radius), String(body.ra ?? ""), String(body.dec ?? "")];
    const { stdout } = await runPython("python", args, { cwd: projectRoot, maxBuffer: 1024 * 1024 });
    return NextResponse.json({ observations: JSON.parse(stdout.trim() || "[]") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Python search failed";
    return NextResponse.json({ error: message.includes("No module named") ? "Python dependencies are not installed. Run pip install -r requirements.txt." : "Could not complete the MAST search." }, { status: 500 });
  }
}