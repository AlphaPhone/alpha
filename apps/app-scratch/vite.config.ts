// The page as the WebView gets it: src/web/index.html and what it loads, `.vibe` included, written to the
// repository's web-dist, which Capacitor packages. Storybook builds the components with the same plugins.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { defineConfig } from "vite";

const mocks = process.env.ELIZA_DEV_ALLOW_TEST_MOCKS === "1";

export default defineConfig({
  root: "src/web",
  publicDir: "../../public",
  envPrefix: "VITE_",
  define: { __ALPHA_TEST_MOCKS__: JSON.stringify(mocks) },
  resolve: { conditions: ["eliza-source"] },
  plugins: [vibelang(), react(), tailwindcss()],
  build: { outDir: "../../../../web-dist", emptyOutDir: true, target: "es2023" },
});
