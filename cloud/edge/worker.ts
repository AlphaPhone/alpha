// Alpha Cloud's web host (the policy's `web` origin, for example cloud.alphacompute.ai).
//
// The phone never browses this host. It exists for three things Android and Google need on the
// app-link host, and all of them are answered by the Cloud API Worker from the database
// registration (scripts/cloud-registration.ts), never by code here:
//   - /.well-known/assetlinks.json                    App Link verification for the release signer
//   - {prefix}/auth/callback, {prefix}/billing/return  native sign-in and checkout returns (fallback
//                                                      page when the App Link does not open the app)
//   - {prefix}/auth/browser-start                       the browser Google sign-in start form
// Upstream's full Pages front end (account dashboard, web billing) is deliberately not deployed:
// account and subscription management happen in the app.
//
// Bindings: API (service binding to this deployment's Cloud API Worker). Vars: none.

interface Env {
  API: {fetch(request: Request): Promise<Response>};
}

const noStore = {"Cache-Control": "no-store"};
const HOSTED = /^\/[a-z0-9][a-z0-9-]{0,62}\/(auth\/callback|auth\/browser-start|billing\/return)$/;

export function edgeRoute(url: URL): "assetlinks" | "hosted" | "health" | null {
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.pathname === "/.well-known/assetlinks.json") return "assetlinks";
  if (url.pathname === "/health") return "health";
  return HOSTED.test(url.pathname) ? "hosted" : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const route = edgeRoute(url);
    if (route === "health") return Response.json({ok: true}, {headers: noStore});
    if (route === "assetlinks") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, {status: 405, headers: {Allow: "GET, HEAD"}});
      // Android's verifier wants HTTP 200, no redirect, application/json from this exact host.
      const upstream = await env.API.fetch(new Request(new URL("/.well-known/assetlinks.json", "https://api.internal"), {method: request.method}));
      return new Response(upstream.body, {status: upstream.status, headers: {"Content-Type": "application/json", "Cache-Control": "public, max-age=300"}});
    }
    if (route === "hosted") {
      // The API resolves the registration by this exact public URL (origin and path, no query).
      const target = new URL("/api/v1/app-auth/mobile/hosted-route", "https://api.internal");
      target.searchParams.set("url", `${url.origin}${url.pathname}${url.search}`);
      const forwarded = new Request(target, request);
      return env.API.fetch(forwarded);
    }
    return new Response("Not Found", {status: 404, headers: noStore});
  },
};
