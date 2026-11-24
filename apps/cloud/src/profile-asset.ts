// spec/cloud/index.md, "The API Worker serves only while the profile in its assets is the text its pinned digest names, and otherwise asks the caller to retry"
import { workerAnswer } from "../gen/cloud.ts";

/** Where the rendered API Worker's static assets hold the environment's profile, beside eliza's return pages. */
export const PROFILE_ASSET = "alpha-cloud/profile.json";

/** The part of the Worker's `ASSETS` binding the profile read uses. */
export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function assetText(assets: AssetFetcher): Promise<string | undefined> {
  try {
    const answer = await assets.fetch(new Request(new URL(PROFILE_ASSET, "https://assets.invalid/")));
    return answer.ok ? await answer.text() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The profile JSON the Worker's assets hold, when it is the text whose SHA-256 the rendered `CLOUD_PROFILE_SHA256`
 * variable names; otherwise undefined.
 * @throws {never}
 */
export async function readProfileAsset(assets: AssetFetcher | undefined, expectedSha256: string | undefined): Promise<string | undefined> {
  const pinned = typeof expectedSha256 === "string" && /^[0-9a-f]{64}$/.test(expectedSha256);
  const text = pinned && assets !== undefined ? await assetText(assets) : undefined;
  const matches = text !== undefined && (await sha256Hex(text)) === expectedSha256;
  return workerAnswer(pinned, text !== undefined, matches) === "Served" ? text : undefined;
}

/**
 * The retryable answer while the profile asset cannot be read, as eliza answers a Worker that is not ready.
 * @throws {never}
 */
export function profileUnavailable(): Response {
  return Response.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
}
