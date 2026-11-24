import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { type Plugin, defineConfig } from "vite";
import { eliza } from "@repo/eliza-harness";
import { fakes } from "./test/fakes/serve.ts";

/**
 * `pnpm dev` serves the page over eliza's agent and cloud; the explore stage, and `ALPHA_FAKES=1 pnpm dev`, over the
 * journeys' fakes as a browser reaches them, and `ALPHA_FAKES=phone pnpm dev` as an Alpha image's plugins do.
 */
const faked = process.env.SPEC_TESTS !== undefined || (process.env.ALPHA_FAKES ?? "") !== "";

/**
 * The built page's Content-Security-Policy, the first element of its head (spec/app/platform/index.md, "A built page
 * runs only its own scripts"): its own scripts and WebAssembly only, no plugin object and no base element. A
 * test-mocks build may also reach a development agent on the machine; the development server is not held to it.
 */
function policy(testMocks: boolean): string {
  const connect = ["'self'", "data:", "blob:", "https:", ...(testMocks ? ["http://10.0.2.2:*", "http://127.0.0.1:*", "http://localhost:*"] : [])];
  return [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    `connect-src ${connect.join(" ")}`,
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "frame-src 'self' blob: data: https:",
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
}

const guarded: Plugin = {
  name: "alpha-content-security-policy",
  apply: "build",
  transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy(process.env.ELIZA_DEV_ALLOW_TEST_MOCKS === "1") }, injectTo: "head-prepend" }],
};

export default defineConfig({
  plugins: [vibelang(), react(), tailwindcss(), guarded, faked ? fakes(process.env.ALPHA_AGENT, process.env.ALPHA_FAKES === "phone") : eliza()],
  /** eliza's clients are linked from their own checkout, whose Effect and Capacitor are this one's versions: one copy of each in the page. */
  resolve: { dedupe: ["effect", "vibelang-runtime", "@capacitor/core"] },
  // spec/app/platform/index.md, "Mocks, fixtures and developer surfaces exist only when the build allows test mocks": the page reads the build's allowance as `import.meta.env.ELIZA_DEV_ALLOW_TEST_MOCKS`.
  envPrefix: ["VITE_", "ELIZA_DEV_ALLOW_TEST_MOCKS"],
});
