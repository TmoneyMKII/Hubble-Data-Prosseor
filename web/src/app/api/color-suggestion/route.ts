import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

const projectRoot = path.resolve(process.cwd(), "..");
const libraryRoot = path.resolve(projectRoot, "hubble_images");
const suggestionScript = `
import json, os, re, sys
from astropy.io import fits

root = sys.argv[1]
groups = {}
for directory, _, names in os.walk(root):
    for name in names:
        if not name.lower().endswith(".fits"):
            continue
        file_path = os.path.join(directory, name)
        try:
            with fits.open(file_path) as hdul:
                primary = hdul[0].header
                for hdu in hdul:
                    if hdu.data is not None and hdu.data.ndim >= 2:
                        filter_name = primary.get("FILTER") or primary.get("FILTER2") or hdu.header.get("FILTER") or hdu.header.get("FILTER2") or ""
                        match = re.search(r"F(\\d{3,4})", str(filter_name), re.I)
                        if not match:
                            match = re.search(r"f(\\d{3,4})[a-z]", name, re.I)
                        if not match:
                            break
                        target = primary.get("TARGNAME") or hdu.header.get("TARGNAME") or "Unknown"
                        groups.setdefault((str(target), tuple(hdu.data.shape[-2:])), []).append((int(match.group(1)), file_path))
                        break
        except Exception:
            continue

choices = [entries for entries in groups.values() if len({wavelength for wavelength, _ in entries}) >= 2]
if not choices:
    raise SystemExit("No compatible multi-filter FITS set found")
entries = max(choices, key=lambda group: len({wavelength for wavelength, _ in group}))
def nearest(target):
    return min(entries, key=lambda entry: abs(entry[0] - target))[1]
print(json.dumps({"red": nearest(800), "green": nearest(550), "blue": nearest(435)}))
`;

export async function GET() {
  try {
    const child = spawn("python", ["-c", suggestionScript, libraryRoot], { cwd: projectRoot });
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { errorOutput += chunk.toString(); });
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    if (exitCode !== 0) return NextResponse.json({ error: errorOutput.trim() || "No compatible multi-filter FITS set found" }, { status: 404 });
    const channels = JSON.parse(output) as Record<"red" | "green" | "blue", string>;
    return NextResponse.json(Object.fromEntries(Object.entries(channels).map(([channel, filePath]) => [channel, path.relative(libraryRoot, filePath).replaceAll(path.sep, "/")] )));
  } catch {
    return NextResponse.json({ error: "Could not inspect local FITS filters" }, { status: 500 });
  }
}