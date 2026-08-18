import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const libraryRoot = path.resolve(process.cwd(), "..", "hubble_images");
const contentTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

export async function GET(request: NextRequest) {
  const relativePath = request.nextUrl.searchParams.get("path");
  if (!relativePath) return new NextResponse("Missing path", { status: 400 });
  const filePath = path.resolve(libraryRoot, relativePath);
  if (!filePath.startsWith(`${libraryRoot}${path.sep}`)) return new NextResponse("Invalid path", { status: 400 });
  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, { headers: { "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store" } });
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }
}