import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const projectRoot = path.resolve(process.cwd(), "..");
const libraryRoot = path.resolve(projectRoot, "hubble_images");

function resolveFitsPath(relativePath: unknown) {
  if (typeof relativePath !== "string") return null;
  const filePath = path.resolve(libraryRoot, relativePath);
  return filePath.startsWith(`${libraryRoot}${path.sep}`) && path.extname(filePath).toLowerCase() === ".fits" ? filePath : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const red = resolveFitsPath(body.red);
    const green = resolveFitsPath(body.green);
    const blue = resolveFitsPath(body.blue);
    if (!red || !green || !blue) return NextResponse.json({ error: "Choose a valid FITS file for each RGB channel" }, { status: 400 });

    const outputPath = path.join(path.dirname(red), `${path.basename(red, ".fits")}_rgb.png`);
    const script = "import sys; from space_telescope_processor import SpaceTelescopeDataProcessor; print(SpaceTelescopeDataProcessor().create_color_composite(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]))";
    const child = spawn("python", ["-c", script, red, green, blue, outputPath], { cwd: projectRoot });
    let errorOutput = "";
    child.stderr.on("data", (chunk: Buffer) => { errorOutput += chunk.toString(); });

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    if (exitCode !== 0) return NextResponse.json({ error: errorOutput.trim() || "Could not create the color composite" }, { status: 500 });

    return NextResponse.json({ path: path.relative(libraryRoot, outputPath).replaceAll(path.sep, "/") });
  } catch {
    return NextResponse.json({ error: "Could not create the color composite" }, { status: 500 });
  }
}