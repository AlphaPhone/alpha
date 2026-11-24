# specs/quint/application/HostedDigestRefresh.qnt
- Lines: 105 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (marker)
- Covers: browser-mounted digest panel: one in-flight refresh owned by the current session, hidden page retires it, late history/sync replies cannot publish for a replacement (`hosted-digest-ui.tsx`, `hosted-digests.ts`, upstream workflow `hosted-digests.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `hosted-digest-refresh.mjs` via `test/quint-hosted-digest-refresh.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`); also imported by `hosted-digest-mutation.mjs`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 88-90 | T10 | Injects state observer at `\tconst mounted = useRef(true);` in the panel source; Chromium mount. | Observe via ports/DOM; drop the injection. | M |
| 2 | harness 62-73 | D5/D6 | Stubs `./cloud-delegation-ui`, dev-profile and recovery modules; `hosted-digest-ui.tsx:289,292` testMocks branch (C4) and dev recovery (:299) are being removed/moved to `dev/`. | Update the virtual module map when those land. | M |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness mounts the real panel with ports and no source injection; module map follows the dev/ split.
