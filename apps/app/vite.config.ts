import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { defineConfig } from "vite";
import { fakes } from "./test/fakes/serve.ts";

export default defineConfig({ plugins: [vibelang(), react(), tailwindcss(), fakes(process.env.ALPHA_AGENT)] });
