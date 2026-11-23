// spec/cloud/deployment.md, "Story: Serve the deployment from a Worker"; spec/cloud/deployment.md, "A Worker serves only after the server's own start checks pass and its bindings agree with its profile"

/** Where `alpha-cloud render` puts the environment's profile in the API Worker's static assets, beside upstream's pages. */
export const PROFILE_ASSET = "alpha-cloud/profile.json";

/** The part of the Worker's `ASSETS` binding the profile read uses. */
export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The profile JSON the Worker's assets hold, or undefined when it is missing, unreadable or not the
 * text whose SHA-256 the rendered `CLOUD_PROFILE_SHA256` variable names.
 * @throws {never}
 */
export async function readProfileAsset(assets: AssetFetcher | undefined, expectedSha256: string | undefined): Promise<string | undefined> {
  if (assets === undefined || typeof expectedSha256 !== "string" || !/^[0-9a-f]{64}$/.test(expectedSha256)) return undefined;
  try {
    const answer = await assets.fetch(new Request(new URL(PROFILE_ASSET, "https://assets.invalid/")));
    if (!answer.ok) return undefined;
    const text = await answer.text();
    return (await sha256Hex(text)) === expectedSha256 ? text : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The retryable answer while the profile asset cannot be read, as upstream answers an unready Worker.
 * @throws {never}
 */
export function profileUnavailable(): Response {
  return Response.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
}
