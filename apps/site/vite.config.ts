import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { defineConfig } from "vite";

/** Alpha's public page: `vite build` writes `dist/`, which the site's deploy uploads as it is. */
export default defineConfig({ plugins: [vibelang(), react(), tailwindcss()] });
