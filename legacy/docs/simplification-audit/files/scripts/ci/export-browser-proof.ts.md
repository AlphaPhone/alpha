# scripts/ci/export-browser-proof.ts
- Lines: 139 | Kind: CI script (exports the flag-off renderer build or the verified workflow worker as an uploaded artifact, filtered by an allow-list) | Verdict: KEEP, SIMPLIFY (format, shared helpers, drop self-checks); owner question on the artifact's consumer
- Covers: copies `test-results/browser-proof-renderer` (a production `vite build` already passed through `audit-production-bundle.ts`) or the verified `artifacts/mobile-workflow-worker-<sdk>` into `test-results/browser-proof/<mode>`, refusing any file outside a name allow-list (no keys, env files, DBs, native libraries, profile/cookie names) and writing `identity.json` with commit/tree/SDK and per-file hashes. Duplicates: SHA-256 and `git()` helpers (C3, 40× / 17×); path-safety walker (one of 11 walkers). Callers/importers: `.github/workflows/browser.yml:98` (`renderer`, artifact `browser-proof-renderer-<sha>-...`), `.github/workflows/resident-prepare.yml:54` (`worker`); imports `scripts/workflow-worker-artifact.ts` (`verifyWorkerArtifact`); test `test/browser-proof-export.test.mjs` (168 lines). No workflow or script downloads these artifacts (grep for `browser-proof-renderer-`/`browser-proof-worker-` finds only the uploads).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | D8 | Minified style: multi-statement lines, 300-character `identity` literal (138), single-letter names. | Reformat; `main(mode)` with named steps. | Low. |
| 2 | 10-11 | C3 | Local `hash` and hardened `git` helpers. | `scripts/lib/hash.ts`, `scripts/lib/git.ts`. | Low. |
| 3 | 12-33, 35-45 | B3 / B5 | Every path is re-walked for symlinks and canonicality; reads use `O_NOFOLLOW`, a 96 MiB global read budget and "changed while reading" checks, on build output this job just produced on a disposable runner. | Keep one check: refuse symlinks during the walk. Drop budgets and re-stat checks. | Low. |
| 4 | 53-84 | keep | The allow-list (`allowed()`) is the policy: what may be published. Keep; move the pdfjs/OCR literal lists next to the code that emits them (`browser-pdf-assets.ts`) or derive them from `verifyWorkerArtifact`/the build manifest. | Medium-low. |
| 5 | 101-111 | B5 | Rejection report written to a separate file with path hashes and truncation flags, then throws. | Throw with the first N rejected paths in the message. | Low. |
| 6 | 127-134 | B5 | Worker mode re-hashes each file against the digests `verifyWorkerArtifact` just verified ("Worker changed after verification"). | Drop the re-hash, or skip `verifyWorkerArtifact` and hash once. | Low. |
| 7 | 138 | B5 / owner | `identity.json` provenance (commit, tree, SDK, run, node, platform, `limits` flags) with no reader in the repo. | Owner question: who consumes `browser-proof-*` artifacts? If nobody, delete the export steps and this script (`audit-production-bundle.ts` already gates the renderer). | Medium. |
| 8 | 92 | keep | Renderer mode asserts `build-flags.json` is flag-off (`testMocks === false`, no `runtimeProfile`) - real production gate, but `audit-production-bundle.ts` checks the same build. | Keep one of the two (prefer the audit). | Low. |

## Proposed end state
If the artifact has a consumer: ~70 readable lines - walk, refuse symlinks, apply the allow-list, copy, write a plain file list with hashes. If not: delete this script, its two workflow steps and `test/browser-proof-export.test.mjs`.
