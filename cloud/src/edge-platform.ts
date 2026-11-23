// spec/cloud/deployment.md, "Story: Serve the deployment from a Worker"
export const EdgeHeaders = globalThis.Headers;
export const EdgeResponse = globalThis.Response;
export const EdgeRequest = globalThis.Request;

const hopByHop = new Set(["host", "forwarded", "connection", "keep-alive", "proxy-connection", "transfer-encoding", "te", "trailer", "upgrade"]);

/** The headers sent on to the API Worker: the caller's own, without hop-by-hop or earlier forwarding headers, naming the web host it was asked for. */
export function forwardedHeaders(incoming: Headers, webHost: string): Headers {
  const headers = new EdgeHeaders()
  incoming.forEach((value, name) => {
    const lower = name.toLowerCase()
    if (!hopByHop.has(lower) && !lower.startsWith("x-forwarded-")) headers.set(lower, value)
  })
  headers.set("x-forwarded-host", webHost)
  headers.set("x-forwarded-proto", "https")
  return headers
}
