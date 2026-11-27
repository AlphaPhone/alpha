import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ManagedRuntime } from "effect";
import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import tokens from "@repo/design-system/tokens.json" with { type: "json" };
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { type Plugin, build, defineConfig } from "vite";
import type { LegalPage as Legal, policyPages as Pages } from "./src/Legal.tsx";
import type { Site } from "./src/Site.tsx";
import type { demo as Demo } from "./src/demo.vibe";

const stable = { "alpha-home.webp": "src/alpha-home.webp", "alpha-mark.svg": "../../packages/design-system/brand/symbol.svg" };

const head: Plugin = {
  name: "alpha-site-head",
  transformIndexHtml: {
    order: "post",
    handler: () => [{ tag: "meta", attrs: { name: "theme-color", content: tokens.color.light.background }, injectTo: "head" }],
  },
};

function withPage(shell: string, html: string): string {
  return shell.replace('<div id="root"></div>', () => `<div id="root">${html}</div>`);
}

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
      await build({ configFile, root, logLevel: "warn", build: { ssr: true, outDir: server, emptyOutDir: true, rolldownOptions: { input: { Site: "src/Site.tsx", Legal: "src/Legal.tsx", demo: "src/demo.vibe" } } } });
      const built = (name: string) => import(pathToFileURL(join(server, `${name}.js`)).href);
      const { Site: drawn } = (await built("Site")) as { Site: typeof Site };
      const { LegalPage, policyPages } = (await built("Legal")) as { LegalPage: typeof Legal; policyPages: typeof Pages };
      const { demo } = (await built("demo")) as { demo: typeof Demo };
      const runtime = ManagedRuntime.make(demo);
      let page: string;
      try {
        page = renderToString(createElement(drawn, { runtime }));
      } finally {
        await runtime.dispose();
      }
      const index = join(out, "index.html");
      const shell = await readFile(index, "utf8");
      await writeFile(index, withPage(shell, page));
      await Promise.all(policyPages.map((policy) => {
        const title = policy.document.title;
        const canonical = `https://alphaphone.dev${policy.path}`;
        const policyShell = shell
          .replace(/<title>[^<]*<\/title>/, () => renderToStaticMarkup(createElement("title", null, title)))
          .replace(/<meta name="description"[^>]*>/, () => renderToStaticMarkup(createElement("meta", { name: "description", content: title })))
          .replace(/<meta property="og:title"[^>]*>/, () => renderToStaticMarkup(createElement("meta", { property: "og:title", content: title })))
          .replace(/<meta property="og:url"[^>]*>/, () => renderToStaticMarkup(createElement("meta", { property: "og:url", content: canonical })))
          .replace(/<link rel="canonical"[^>]*>/, () => renderToStaticMarkup(createElement("link", { rel: "canonical", href: canonical })));
        const html = renderToString(createElement(LegalPage, { page: policy }));
        return writeFile(join(out, `${policy.path.slice(1)}.html`), withPage(policyShell, html));
      }));
      await Promise.all(Object.entries(stable).map(([name, source]) => copyFile(resolve(root, source), join(out, name))));
    },
  };
}

export default defineConfig({ plugins: [vibelang(), react(), tailwindcss(), head, prerender()] });
