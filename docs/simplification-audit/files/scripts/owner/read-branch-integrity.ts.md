# scripts/owner/read-branch-integrity.ts
- Lines: 126 | Kind: manual owner tool (read back which ruleset/classic protection enforces non-fast-forward, deletion and signed commits on shared branches; bypass actors) | Verdict: MERGE with `scripts/ci/read-required-checks.ts` into one branch-rules readback tool (or DELETE both if the owner no longer runs them)
- Covers: repository-configuration evidence for #658 step 4. Duplicates: `scripts/ci/read-required-checks.ts` reads the same `repos/{r}/rulesets` and branch rules for required status checks (same `Ruleset` type, scripts research §5); both are owner-run readbacks, neither runs in CI. Callers/importers: `test/owner-branch-integrity.test.mjs` and `test/owner-incident-response.test.mjs` (both import `compareIntegrity` only). No npm script or workflow. `scripts/owner/rulesets/*.json` (not in this chunk) are the rulesets the owner installs; only the incident test reads them.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 73 | A7 | Depends on the incident IOC file only to default `--repo`. | Default from the `origin` remote (`repositoryFromRemote` already exists in `read-required-checks.ts`). | None |
| 2 | whole | C5 | Two sibling readback tools over the same GitHub rules API in two folders. | One `scripts/owner/read-branch-rules.ts` with `--signatures` / `--required-checks` sections, sharing one ruleset fetch. | Low |
| 3 | 38-45 | A8 | JSDoc `@param` block duplicates the TypeScript interface above it. | Delete the JSDoc. | None |
| 4 | tests | T3 | `test/owner-branch-integrity.test.mjs` unit-tests `compareIntegrity` with fabricated rule lists; no release gate depends on this tool. | Delete the test with the merge (T5: tests of owner tooling that gates nothing). | None |

## Proposed end state
A single owner readback tool for branch rules (signatures, force-push, deletion, required checks) built on `scripts/lib/github-read.ts`, run by hand, no unit tests. D12 says repository settings are the owner's; this tool only reads them, so keeping one manual readback is reasonable. If the owner prefers, delete both tools and rely on the GitHub UI.
