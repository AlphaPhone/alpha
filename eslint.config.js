import { defineConfig, globalIgnores } from "eslint/config"
import tseslint from "typescript-eslint"
import vibelang from "vibelang/eslint"
import { withWorkspaceBarrels } from "./vendor/eliza/vibestack/eslint.ts"

export default withWorkspaceBarrels(
  defineConfig(
    globalIgnores([
      "**/node_modules/**",
      "**/dist/**",
      "**/gen/**",
      "**/generated/**",
      "web-dist/**",
      "android/**",
      "ios/**",
      "vendor/**",
      "**/.spec-cache/**",
      "**/.studio/**",
      "**/.turbo/**",
      "**/.cache/**",
      "**/.vibe/**",
      "**/storybook-static/**",
      "**/test-results/**",
      "coverage/**",
    ]),
    {
      files: ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
      languageOptions: { parser: tseslint.parser },
    },
    {
      files: ["**/*.{vibe,vibex}"],
      languageOptions: { parser: vibelang },
    },
  ),
  { root: import.meta.dirname },
)
