import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { defineConfig } from "vite";
import { eliza } from "./test/eliza/serve.ts";
import { fakes } from "./test/fakes/serve.ts";

/** `pnpm dev` serves the page over eliza's agent and cloud; the explore stage, and `ALPHA_FAKES=1 pnpm dev`, over the journeys' fakes. */
const faked = process.env.SPEC_TESTS !== undefined || process.env.ALPHA_FAKES === "1";

export default defineConfig({
  plugins: [vibelang(), react(), tailwindcss(), faked ? fakes(process.env.ALPHA_AGENT) : eliza()],
  // eliza's clients are linked from their own checkout, whose Effect and Capacitor are this one's versions: one copy of each in the page.
  resolve: { dedupe: ["effect", "vibelang-runtime", "@capacitor/core"] },
});
