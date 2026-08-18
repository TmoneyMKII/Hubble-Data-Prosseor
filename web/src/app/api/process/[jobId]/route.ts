import { NextResponse } from "next/server";
import { getJob } from "../job-store";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const job = getJob(jobId);
  return job ? NextResponse.json(job) : NextResponse.json({ error: "Processing job not found" }, { status: 404 });
}