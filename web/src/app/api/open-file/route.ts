import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const openWithWindows = promisify(execFile);
const projectRoot = path.resolve(process.cwd(), "..");
const libraryRoot = path.resolve(projectRoot, "hubble_images");

export async function POST(request: NextRequest) {
  try {
    if (process.platform !== "win32") return NextResponse.json({ error: "Opening local files is currently supported on Windows only" }, { status: 501 });
    const body = await request.json();
    const relativePath = typeof body.path === "string" ? body.path : "";
    const filePath = path.resolve(libraryRoot, relativePath);
    if (!relativePath || !filePath.startsWith(`${libraryRoot}${path.sep}`) || path.extname(filePath).toLowerCase() !== ".png") return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    await access(filePath);
    await openWithWindows("explorer.exe", [filePath]);
    return NextResponse.json({ opened: true });
  } catch {
    return NextResponse.json({ error: "The local image file could not be opened" }, { status: 500 });
  }
}