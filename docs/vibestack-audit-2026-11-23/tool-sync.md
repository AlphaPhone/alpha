# lalalune/vibestack tool → elizaOS/eliza `vibestack` (checked 2026-11-23 ~05:40Z)

- Tool main: b27cf24 (merge of #211). Open tool PRs: #216 (comment lint, `@throws`-only doc comments).
- eliza origin/vibestack f3a693017 records its import in `vibestack/README.md`: tool f5d18d3 (#208).
- Not yet imported: bfd4cc2, dec60c5, #212 (5d7111d), #211 (b27cf24): `vibestack/{formal,pipeline,selftest}.ts`,
  CONTRIBUTING.md, `.github/workflows/retire-merged-pr.yml`. Codex draft elizaOS/eliza#40251
  "Sync Vibestack simulation caching and merged-PR cleanup" carries them.
- eliza keeps its own `vibestack/ci-check-phase.ts`, `vibestack/patches/` and README on purpose.
- To close: merge tool #216 when green, merge eliza#40251 (and a follow-up import for #216), then
  re-diff `vibestack/` against tool main and confirm the README names the new tool commit.
