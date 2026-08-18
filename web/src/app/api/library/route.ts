import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const libraryRoot = path.resolve(process.cwd(), "..", "hubble_images");
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

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
        return { name: path.basename(filePath), path: path.relative(libraryRoot, filePath).replaceAll(path.sep, "/"), type: imageExtensions.has(path.extname(filePath).toLowerCase()) ? "image" : "fits", size: details.size, modified: details.mtime.toISOString() };
      }));
    return NextResponse.json({ files: files.sort((a, b) => b.modified.localeCompare(a.modified)) });
  } catch {
    return NextResponse.json({ files: [], error: "Library folder is not available" });
  }
}