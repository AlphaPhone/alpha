// The tokens only (design.md): no palette class, arbitrary color or literal color in the page.
// The same rule set as the pinned vibestack app example (vendor/eliza/vibestack/examples/fullstack).
import { readFileSync } from "node:fs";
import path from "node:path";
import tailwind from "eslint-plugin-better-tailwindcss";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import { designSystem } from "../../vendor/eliza/vibestack/design/eslint.ts";
import { parseTokens } from "../../vendor/eliza/vibestack/design/tokens.ts";

export default defineConfig({
  files: ["src/web/**/*.tsx"],
  languageOptions: { parser: tseslint.parser },
  extends: [designSystem({ tailwind, tokens: parseTokens(JSON.parse(readFileSync(path.join(import.meta.dirname, "tokens.json"), "utf8"))), entryPoint: path.join(import.meta.dirname, "src/web/index.css") })],
});
