/**
 * Same-origin backend proxy route.
 *
 * Only GET and HEAD are exported, so every other method receives 405 from the framework.
 * All behaviour lives in `proxyToBackend`, which this adapter feeds with the decoded path
 * segments, the raw query string and the client's cancellation signal.
 */
import type { NextRequest } from "next/server";
import { proxyToBackend } from "../../../../lib/api/proxy";

type Context = { params: Promise<{ path: string[] }> };

async function forward(
  request: NextRequest,
  context: Context,
  method: "GET" | "HEAD",
): Promise<Response> {
  const { path } = await context.params;
  return proxyToBackend({
    method,
    segments: path ?? [],
    search: request.nextUrl.search,
    signal: request.signal,
  });
}

export async function GET(request: NextRequest, context: Context) {
  return forward(request, context, "GET");
}

export async function HEAD(request: NextRequest, context: Context) {
  return forward(request, context, "HEAD");
}

export const dynamic = "force-dynamic";
