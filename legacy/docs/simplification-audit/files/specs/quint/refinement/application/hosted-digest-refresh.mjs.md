# specs/quint/refinement/application/hosted-digest-refresh.mjs
- Lines: 197 | Kind: Quint refinement harness (source campaign, Chromium-mounted panel, `HostedDigestRefresh`, live) + shared mount helper | Verdict: PORT (and split the mount helper out)
- Covers: one in-flight digest refresh owned by the current session; hide retires it; history/sync/status replies from a retired binding cannot publish; disconnect clears the Home brief (`apps/app/src/runtime/hosted-digest-ui.tsx`, `hosted-digests.ts`). Duplicates: `test/hosted-digest-refresh-ownership.test.mjs` drives the same mount. Callers/importers: `test/quint-hosted-digest-refresh.test.mjs`, aggregate `index.mjs`; `withHostedDigestRefresh` is imported by `hosted-digest-mutation.mjs`, `source-renewal-question.mjs`, `test/hosted-digest-refresh-ownership.test.mjs`, `test/hosted-digest-mutation-ownership.test.mjs`, `test/quint-source-renewal-question.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 86-94 | T10 | `onLoad` injects `globalThis.inspectHostedDigestRefresh` after the literal `\tconst mounted = useRef(true);` (tab-indented) exposing ten closure values (`open, available, message, results, busy, pending…`). | Observe through the DOM the panel renders (open state, message, rows, busy) and through the port calls; the one value that is not rendered (`refreshFlight.full`) is already inferable from the pending `sync` port request (line 143 asserts exactly that). | H: Prettier (D9) converts tabs and breaks this seam. |
| 2 | 13-55 | T2/D5 | 25 stub modules keyed by importer + relative specifier, including dev-only modules (`../browser/dev-profile`, `../browser/digest-storage`, `./local-agent-storage`, `../browser/development-digests`) and the god module `./connection-ui`. A renamed import silently bundles the real module or fails to resolve. | Keep the port map (it is the right mechanism) but re-key it when the `dev/` boundary lands; stubs of deleted modules go. | M |
| 3 | 102-128 | C5 | `withHostedDigestRefresh` is a shared mount helper with five importers living inside one model's harness. | Move to `specs/quint/refinement/application/hosted-digest-panel.mjs` (with `fixture` path and port map); this file keeps only the HostedDigestRefresh cases. | L |
| 4 | 104 | — | Launches Chromium per campaign (`chromium.launch`), one page per case; ~9 page loads. Notable runtime, acceptable for a mounted-panel check. | Keep; share one browser across the digest harnesses when run by one runner. | — |
| 5 | test wrapper | B5 | Exact `observedFields.length` / action list asserts. | Drop. | L |

## Proposed end state
- `hosted-digest-panel.mjs`: bundle + port map + Chromium mount (`withHostedDigestRefresh`), observation from DOM and ports only.
- `hosted-digest-refresh.mjs`: the nine cases and `observe()` projection.
- No source-text seam; dev-module stubs follow the `dev/` split.
