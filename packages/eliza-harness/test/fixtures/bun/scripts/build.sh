set -e
bun run build
bun ./worker.ts
bunx eslint .
