import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const libraryRoot = path.resolve(process.cwd(), "..", "hubble_images");
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function describeFilter(fileName: string) {
  const match = fileName.match(/f(\d{3,4})[a-z]/i);
  if (!match) return { filter: "Unknown filter", colorHint: "Choose manually" };
  const wavelength = Number(match[1]);
  const colorHint = wavelength >= 700 ? "Red channel" : wavelength >= 500 ? "Green channel" : "Blue channel";
  return { filter: `F${match[1].toUpperCase()}`, colorHint };
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
  }));
  return nested.flat();
}

export async function GET() {
  try {
    const paths = await collectFiles(libraryRoot);
    const files = await Promise.all(paths
      .filter((filePath) => [".fits", ...imageExtensions].includes(path.extname(filePath).toLowerCase()))
      .map(async (filePath) => {
        const details = await stat(filePath);
        const type = imageExtensions.has(path.extname(filePath).toLowerCase()) ? "image" : "fits";
        return { name: path.basename(filePath), path: path.relative(libraryRoot, filePath).replaceAll(path.sep, "/"), type, size: details.size, modified: details.mtime.toISOString(), ...(type === "fits" ? describeFilter(path.basename(filePath)) : {}) };
      }));
    return NextResponse.json({ files: files.sort((a, b) => b.modified.localeCompare(a.modified)) });
  } catch {
    return NextResponse.json({ files: [], error: "Library folder is not available" });
  }
}