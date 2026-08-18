import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const runPython = promisify(execFile);
const projectRoot = path.resolve(process.cwd(), "..");
const libraryRoot = path.resolve(projectRoot, "hubble_images");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const relativePath = typeof body.path === "string" ? body.path : "";
    const imagePath = path.resolve(libraryRoot, relativePath);
    if (!relativePath || !imagePath.startsWith(`${libraryRoot}${path.sep}`) || path.extname(imagePath).toLowerCase() !== ".png") return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    await readFile(imagePath);
    const script = `
import json, sys
from pathlib import Path
from astropy.io import fits
path = Path(sys.argv[1])
header = None
with fits.open(path) as hdul:
    for hdu in hdul:
        if hdu.data is not None and len(hdu.data.shape) >= 2:
            header = hdu.header
            break
header = header or {}
print(json.dumps({"target": str(header.get("TARGNAME", "Hubble field")), "instrument": str(header.get("INSTRUME", "HST instrument")), "filter": str(header.get("FILTER", "broadband filter")), "exposure": str(header.get("EXPTIME", "unknown"))}))
`;
    const fitsPath = imagePath.replace(/\.png$/i, ".fits");
    const { stdout } = await runPython("python", ["-c", script, fitsPath], { cwd: projectRoot, maxBuffer: 1024 * 1024 });
    const details = JSON.parse(stdout.trim());
    const target = details.target === "Hubble field" ? path.basename(imagePath, ".png") : details.target;
    const text = `A new look at ${target}. ✦\n\nThis Hubble image was captured with ${details.instrument} using the ${details.filter} filter${details.exposure !== "unknown" ? ` with an exposure of ${details.exposure} seconds` : ""}. The image began as scientific FITS data from the MAST archive.\n\nOur local Python processor uses Astroquery to search MAST, Astropy to read and interpret the FITS data, NumPy to prepare the pixel array, and Matplotlib to apply logarithmic contrast and render the final preview.\n\nThe result is a small piece of telescope data turned into a viewable window on ${target}.\n\n#Hubble #NASA #Astronomy #Astrophotography #SpaceScience #Astropy #Python`;
    return NextResponse.json({ title: `Post about ${target}`, text, target, instrument: details.instrument, filter: details.filter });
  } catch {
    return NextResponse.json({ error: "Could not read the matching FITS metadata. Keep the FITS file beside the PNG and try again." }, { status: 500 });
  }
}