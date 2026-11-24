# test/hosted-digest-mutation-ownership.test.mjs
- Lines: 75 | Kind: scenario test on the Quint refinement harness (`withHostedDigestRefresh` from `specs/quint/refinement/application/hosted-digest-refresh.mjs`: esbuild-bundles the real `hosted-digest-ui.tsx` with ~25 stubbed relative imports, injects an observer at the literal `\tconst mounted = useRef(true);`, and drives it in headless Chromium) | Verdict: MERGE into `test/quint-hosted-digest-refresh.test.mjs`
- Covers: a digest save that settles after the user switched agent session clears only its own journal and never publishes into the replacement session; retired rejections cannot publish after follow-up reads; busy state stays per-session. Duplicates: `test/hosted-digest-refresh-ownership.test.mjs` (same harness, same prepare pattern), `test/quint-hosted-digest-refresh.test.mjs` (Quint traces of the same panel), `test/browser/dev-digest-schedule.spec.ts:22` ("digest mutation replay … account retirement retain exact identities"). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-74 | T4 / P3 | Each of three files launches Chromium and re-bundles the panel (120 s timeout each). | One file, one `withHostedDigestRefresh` call, all scenarios as subtests. | Low |
| 2 | 4 | T10 | Depends on a harness that cuts the panel source at a literal line and stubs 25 import specifiers by relative path; the panel split (`runtime/digests/`, cross-file-actions) breaks it. | Harness PORT (owned by the Quint chunk): the panel exports an observer hook or the fixture renders the panel with injected ports as props. | Medium |
| 3 | 6-19, 22-74 | — | Session-switch races during a pending mutation are real and not in a Quint trace. | Keep the three scenarios; ideally add them as Quint traces so one runner checks both. | Medium |

## Proposed end state
File deleted; its three scenarios move into `test/quint-hosted-digest-refresh.test.mjs` (one Chromium launch for the
receipt check and all scenarios), or become traces of the hosted-digest-refresh model.
