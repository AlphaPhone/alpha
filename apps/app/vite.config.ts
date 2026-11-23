// The page as the WebView gets it: src/web/index.html and what it loads, `.vibe` included, written to the
// repository's web-dist, which Capacitor packages. Storybook builds the components with the same plugins.
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { defineConfig, type Plugin } from "vite";

const mocks = process.env.ELIZA_DEV_ALLOW_TEST_MOCKS === "1";

/**
 * The page's Content-Security-Policy (spec/platform/index.md, "A built page runs only its own scripts"): its own scripts and
 * WebAssembly, no eval, no inline script, no plugins and no base element. data: and blob: only resolve bytes already in the
 * renderer (saved photos, captures); a test-mocks build may also reach a development agent on the machine or the emulator's host.
 */
export function contentSecurityPolicy(testMocks: boolean): string {
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

/** The built page carries the policy as its first head element, so it covers every route the page serves, the delegation return's landing included; dev serve stays relaxed for hot reload. */
function contentSecurity(): Plugin {
  return {
    name: "alpha-content-security-policy",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      // Only the app's own page: Storybook's iframe, built with these plugins, runs inline scripts of its own.
      handler: (_html, context) => context.filename.endsWith(`${path.sep}src${path.sep}web${path.sep}index.html`)
        ? [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy(mocks) }, injectTo: "head-prepend" }]
        : [],
    },
  };
}

export default defineConfig({
  root: "src/web",
  publicDir: "../../public",
  envPrefix: "VITE_",
  define: { __ALPHA_TEST_MOCKS__: JSON.stringify(mocks) },
  resolve: { conditions: ["eliza-source"] },
  plugins: [contentSecurity(), vibelang(), react(), tailwindcss()],
  build: { outDir: "../../../../web-dist", emptyOutDir: true, target: "es2023" },
});
