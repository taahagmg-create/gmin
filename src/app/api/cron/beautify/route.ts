import { NextResponse } from "next/server";
import { createAutostockSource } from "@/lib/inventory/autostock";
import manifestJson from "@/data/beautify-manifest.json";
import type { BeautifyManifest } from "@/lib/beautify/types";

/**
 * Vercel cron: detect new stock and hand the work to GitHub Actions.
 *
 * This function deliberately does NOT process images. Segmentation needs an
 * ONNX model and sharp needs a native binary; shipping either into a serverless
 * bundle means fighting size limits and maintaining a second copy of the
 * pipeline that will drift from the one in scripts/beautify.
 *
 * So the split is: Vercel notices, Actions does the work. One implementation,
 * one environment, and the cron stays a couple of seconds rather than minutes.
 *
 * Set CRON_SECRET in Vercel; Vercel sends it as a bearer token automatically.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const manifest = manifestJson as BeautifyManifest;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  let newVehicles: string[] = [];
  try {
    const vehicles = await createAutostockSource().listVehicles();
    newVehicles = vehicles.filter((v) => !manifest.vehicles[v.id]).map((v) => v.slug);
  } catch (e) {
    console.error("[cron/beautify] could not read inventory:", e);
    return NextResponse.json({ ok: false, error: "inventory unavailable" }, { status: 502 });
  }

  if (newVehicles.length === 0) {
    return NextResponse.json({ ok: true, newVehicles: 0, dispatched: false });
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    // Still useful: the count is logged even when dispatch isn't configured.
    console.warn(
      `[cron/beautify] ${newVehicles.length} new vehicles but GITHUB_DISPATCH_TOKEN/` +
        "GITHUB_REPOSITORY are not set — not dispatching.",
    );
    return NextResponse.json({ ok: true, newVehicles: newVehicles.length, dispatched: false });
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      event_type: "new-stock",
      client_payload: { count: newVehicles.length, slugs: newVehicles.slice(0, 50) },
    }),
  });

  if (!res.ok) {
    console.error(`[cron/beautify] dispatch failed ${res.status}`);
    return NextResponse.json(
      { ok: false, newVehicles: newVehicles.length, dispatched: false, status: res.status },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, newVehicles: newVehicles.length, dispatched: true });
}
