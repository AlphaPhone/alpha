# scripts/owner/gh-readonly.ts
- Lines: 162 | Kind: shared tooling (read-only `gh api` client, pagination, arg parser, IOC loader for incident #658/#679) | Verdict: SIMPLIFY (keep the GitHub read client; delete the incident/IOC half with the incident tools)
- Covers: one GET-only `gh api` wrapper with endpoint allowlist, timeout and status extraction; pagination; collecting unreadable notes; a typed flag parser; the IOC file schema and loader. Duplicates: `parseArgs` is another of ~14 arg parsers (`input.ts:option`, `native-voice-latency-emulator.ts:parse`); `ROOT` is another repo-root constant; `scripts/ci/read-required-checks.ts:25` wraps `ghGet` again with different defaults. Callers/importers: `scripts/owner/forged-branch-scan.ts`, `incident-access-audit.ts`, `incident-ci-exposure.ts`, `merge-review.ts` (IOC parts), `read-branch-integrity.ts`, `scripts/ci/read-required-checks.ts` (`ghGet`, `ROOT`); tests `test/owner-incident-response.test.mjs`, `test/ci-ruleset-readback.test.mjs`. No npm script or workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 16-42 | A7 | `IOC_FILE`, `IncidentIocs`, `loadIocs`, `fullName` exist only for the one-off incident tools (and `read-branch-integrity.ts` uses `loadIocs` just to default the repo name). | Delete with the incident tools; `read-branch-integrity` takes the repo from `git remote get-url origin` like `read-required-checks.ts:repositoryFromRemote`. | Low |
| 2 | 121-150 | C3 | Typed custom arg parser. | Replace with `node:util` `parseArgs` (supports `multiple: true`) via the shared `scripts/lib/args.ts`. | Low |
| 3 | 45-49 | B3 | `assertReadOnlyEndpoint` regex on endpoints built by our own code; the `--method GET` flag already guarantees read-only. It is a cheap guard against an endpoint starting with `-` being read as a gh flag. | Keep the leading-dash check; the character allowlist can go. | None |
| 4 | 152-162 | — | `unreadableNote`/`collectRows` make partial reads visible; good. | Keep. | — |
| 5 | path | D11 | After the incident tools go, the remaining users are a CI-readback tool (`scripts/ci/read-required-checks.ts`) and `read-branch-integrity.ts`. | Move to `scripts/lib/github-read.ts`. | Low |

## Proposed end state
~90-line `scripts/lib/github-read.ts`: `ghGet`, `ghGetAll`, `collectRows`, `unreadableNote`. IOC types and loader deleted with the incident tools; arg parsing from the shared helper. Importers: `read-required-checks.ts` and (if kept) the merged branch-rules readback tool.
