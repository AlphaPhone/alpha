import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { defineConfig } from "vite";
import { eliza } from "./test/eliza/serve.ts";
import { fakes } from "./test/fakes/serve.ts";

/**
 * `pnpm dev` serves the page over eliza's agent and cloud; the explore stage, and `ALPHA_FAKES=1 pnpm dev`, over the
 * journeys' fakes as a browser reaches them, and `ALPHA_FAKES=phone pnpm dev` as an Alpha image's plugins do.
 */
const faked = process.env.SPEC_TESTS !== undefined || (process.env.ALPHA_FAKES ?? "") !== "";

export default defineConfig({
  plugins: [vibelang(), react(), tailwindcss(), faked ? fakes(process.env.ALPHA_AGENT, process.env.ALPHA_FAKES === "phone") : eliza()],
  // eliza's clients are linked from their own checkout, whose Effect and Capacitor are this one's versions: one copy of each in the page.
  resolve: { dedupe: ["effect", "vibelang-runtime", "@capacitor/core"] },
});
