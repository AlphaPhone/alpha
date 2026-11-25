import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { type Plugin, defineConfig } from "vite";
import { eliza } from "@repo/eliza-harness/serve";
import { fakePhone, fakes } from "./test/fakes/serve.ts";

/**
 * `pnpm dev` serves the page over eliza's agent and cloud; the explore stage, and `ALPHA_FAKES=1 pnpm dev`, over the
 * journeys' fakes as a browser reaches them, and `ALPHA_FAKES=phone pnpm dev` as an Alpha image's plugins do.
 * `ALPHA_PHONE=1 pnpm dev` serves eliza's agent and cloud through the fake phone's plugins, as an Alpha image reaches them.
 */
const faked = process.env.SPEC_TESTS !== undefined || (process.env.ALPHA_FAKES ?? "") !== "";
const phoned = process.env.ALPHA_PHONE === "1";

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

/** Camera and Files recognize text offline, from the worker, model and supported engine cores in this build. */
function localOcr(): Plugin {
  const require = createRequire(import.meta.url);
  const assets = new Map<string, { readonly bytes: Buffer; readonly type: string }>();
  const add = (name: string, from: string, source: string, type: string) => {
    assets.set(name, { bytes: readFileSync(join(dirname(require.resolve(`${from}/package.json`)), source)), type });
  };
  const load = () => {
    if (assets.size > 0) return;
    add("worker.min.js", "tesseract.js", "dist/worker.min.js", "text/javascript");
    for (const core of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
      const name = `tesseract-core-${core}.wasm.js`;
      add(name, "tesseract.js-core", name, "text/javascript");
    }
    add("eng.traineddata.gz", "@tesseract.js-data/eng", "4.0.0_best_int/eng.traineddata.gz", "application/gzip");
    add("tesseract-LICENSE.txt", "tesseract.js", "LICENSE.md", "text/plain");
    add("core-LICENSE.txt", "tesseract.js-core", "LICENSE", "text/plain");
  };
  return {
    name: "alpha-local-ocr",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? "";
        if (!url.startsWith("/ocr/") || request.method !== "GET" && request.method !== "HEAD") return next();
        load();
        const file = assets.get(url.slice(5));
        if (file === undefined) return next();
        response.writeHead(200, { "Content-Type": file.type, "Content-Length": file.bytes.length, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache" });
        response.end(request.method === "HEAD" ? undefined : file.bytes);
      });
    },
    generateBundle() {
      load();
      for (const [name, file] of assets) this.emitFile({ type: "asset", fileName: `ocr/${name}`, source: file.bytes });
    },
  };
}

export default defineConfig({
  plugins: [vibelang(), react(), tailwindcss(), guarded, localOcr(), ...(faked ? [fakes(process.env.ALPHA_AGENT, process.env.ALPHA_FAKES === "phone")] : [eliza(), ...(phoned ? [fakePhone()] : [])])],
  /** eliza's clients are linked from their own checkout, whose Effect and Capacitor are this one's versions: one copy of each in the page. */
  resolve: { dedupe: ["effect", "vibelang-runtime", "@capacitor/core"] },
  // spec/app/platform/index.md, "Mocks, fixtures and developer surfaces exist only when the build allows test mocks": the page reads the build's allowance as `import.meta.env.ELIZA_DEV_ALLOW_TEST_MOCKS`.
  envPrefix: ["VITE_", "ELIZA_DEV_ALLOW_TEST_MOCKS"],
});
