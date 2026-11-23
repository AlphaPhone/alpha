// spec/cloud/deployment.md, "Story: Serve the deployment from a Worker"
export const EdgeResponse = globalThis.Response;
export const EdgeRequest = globalThis.Request;
/** The Worker's fetch, bound to its global scope. */
export const edgeFetch: typeof globalThis.fetch = (input, init) => globalThis.fetch(input, init);
