import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Layer, ManagedRuntime } from "effect";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import tokens from "@repo/design-system/tokens.json" with { type: "json" };
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { type Plugin, build, defineConfig } from "vite";
import type { Site } from "./src/Site.tsx";
import type { browserPage as Page, demo as Demo } from "./src/demo.vibe";

const stable = { "alpha-home.webp": "src/alpha-home.webp", "alpha-mark.svg": "../../packages/design-system/brand/symbol.svg" };

const head: Plugin = {
  name: "alpha-site-head",
  transformIndexHtml: {
    order: "post",
    handler: () => [{ tag: "meta", attrs: { name: "theme-color", content: tokens.color.light.background }, injectTo: "head" }],
  },
};

function prerender(): Plugin {
  let root = "";
  let out = "";
  let configFile: string | undefined;
  return {
    name: "alpha-site-prerender",
    apply: (_, { command, isSsrBuild }) => command === "build" && !isSsrBuild,
    configResolved(config) {
      root = config.root;
      out = resolve(config.root, config.build.outDir);
      configFile = config.configFile;
    },
    async closeBundle() {
      const server = join(root, ".cache/prerender");
      await build({ configFile, root, logLevel: "warn", build: { ssr: true, outDir: server, emptyOutDir: true, rolldownOptions: { input: { Site: "src/Site.tsx", demo: "src/demo.vibe" } } } });
      const built = (name: string) => import(pathToFileURL(join(server, `${name}.js`)).href);
      const { Site: drawn } = (await built("Site")) as { Site: typeof Site };
      const { demo, browserPage } = (await built("demo")) as { demo: typeof Demo; browserPage: typeof Page };
      const page = renderToString(createElement(drawn, { runtime: ManagedRuntime.make(Layer.provide(demo, browserPage)) }));
      const index = join(out, "index.html");
      await writeFile(index, (await readFile(index, "utf8")).replace('<div id="root"></div>', `<div id="root">${page}</div>`));
      await Promise.all(Object.entries(stable).map(([name, source]) => copyFile(resolve(root, source), join(out, name))));
    },
  };
}

export default defineConfig({ plugins: [vibelang(), react(), tailwindcss(), head, prerender()] });
