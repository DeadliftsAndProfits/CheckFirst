/**
 * POST /api/search — streaming search endpoint.
 *
 * Accepts a SearchInput JSON body, validates & rate-limits, then streams
 * newline-delimited JSON (NDJSON) SearchEvents as providers settle (§24, A4).
 * Secrets stay server-side; the client only ever sees provider results.
 */
import { NextRequest } from "next/server";
import type { SearchInput, SearchType } from "@/types/core";
import { runSearch } from "@/lib/orchestrator";
import { validateAndNormalise } from "@/lib/validation";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SearchType[] = ["person", "business", "phone", "email", "website"];
const MAX_BODY = 8 * 1024; // 8KB — search inputs are small; reject oversized payloads.

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : "") || req.headers.get("x-real-ip") || "local";
}

/** Coerce arbitrary JSON into a bounded SearchInput (strings only, capped). */
function sanitise(body: unknown): SearchInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const type = b.type;
  if (typeof type !== "string" || !VALID_TYPES.includes(type as SearchType)) return null;

  const out: Record<string, string> = {};
  const arrays: Record<string, string[]> = {};
  const ARRAY_FIELDS = new Set(["phones", "emails"]);
  for (const [k, v] of Object.entries(b)) {
    if (k === "type") continue;
    if (typeof v === "string") {
      const trimmed = v.slice(0, 200);
      if (trimmed.trim()) out[k] = trimmed;
    } else if (ARRAY_FIELDS.has(k) && Array.isArray(v)) {
      const cleaned = v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.slice(0, 200))
        .filter((x) => x.trim())
        .slice(0, 5);
      if (cleaned.length) arrays[k] = cleaned;
    }
  }
  return { type: type as SearchType, ...out, ...arrays };
}

export async function POST(req: NextRequest) {
  // Rate limit.
  const rl = rateLimit(clientKey(req));
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Too many searches. Please slow down.", retryAfter: rl.retryAfterSeconds }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSeconds) },
    });
  }

  // Size guard.
  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return new Response(JSON.stringify({ error: "Request too large" }), { status: 413, headers: { "content-type": "application/json" } });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const input = sanitise(parsed);
  if (!input) {
    return new Response(JSON.stringify({ error: "Invalid search type or input" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // Pre-validate so obvious form errors return 422 rather than a stream.
  const check = validateAndNormalise(input);
  if (!check.ok) {
    return new Response(JSON.stringify({ error: "Validation failed", fields: check.errors }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runSearch(input)) {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        controller.enqueue(encoder.encode(JSON.stringify({ kind: "fatal", message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export function GET() {
  return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers: { "content-type": "application/json" } });
}
