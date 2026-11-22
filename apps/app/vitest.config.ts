import tailwindcss from "@tailwindcss/vite";
import { project } from "../../vendor/eliza/vibestack/testing/vitest.ts";

export default project({ root: import.meta.dirname, plugins: [tailwindcss()] });
