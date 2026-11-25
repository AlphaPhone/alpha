/** Whether this build was made with `ELIZA_DEV_ALLOW_TEST_MOCKS=1` (vite.config.ts exposes it to the page). */
export const allowsTestMocks = (): boolean => import.meta.env.ELIZA_DEV_ALLOW_TEST_MOCKS === "1";

/** Whether the page was opened with the explicit `?tools=1` query, which alone admits nothing (spec/app/platform/index.md). */
export const toolsAsked = (): boolean => new URLSearchParams(globalThis.location?.search ?? "").get("tools") === "1";

/** The version this build of Alpha was made as (vite.config.ts names it), or empty where the build names none. */
export function appVersion(): string {
  const named: unknown = import.meta.env.VITE_ALPHA_VERSION;
  return typeof named === "string" ? named : "";
}
