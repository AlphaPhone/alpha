# specs/quint/refinement/application/source-renewal-question.mjs
- Lines: 92 | Kind: Quint refinement harness on the mounted digest panel in Chromium (via `hosted-digest-refresh.mjs` `withHostedDigestRefresh`, `native: true`) | Verdict: KEEP
- Covers: `SourceRenewalQuestion` — a brief-source renewal notification opens an Ask question only for the matching current owner/revision/token; retired reads/settlements cannot compose or report; lifecycle close preserves the tap; sensitive screen and wrong revision do not open. Product: `apps/app/src/runtime/hosted-digest-ui.tsx` and the shared tap resolver/content dialog. Duplicates: `test/source-renewal-question.test.mjs` (one esbuild-bundled host test of the same admission rule). Callers: `test/quint-source-renewal-question.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-10, 24 | C6 | Hard-codes product copy (refusal text, `Synced with this agent.`, full draft text) and asserts it on every observation. Copy edits break a formal harness. | Import the strings from the product module, or project draft presence/session only. | L |
| 2 | 19 | B3 | `assert.equal(state.session, state.binding)` checks the fixture's own invariant. | Keep only if it is a product invariant; otherwise drop. | L |
| 3 | — | T4 | `test/source-renewal-question.test.mjs` duplicates the single happy/refusal path. | Delete the host test; this harness is the integration coverage. | L |
| 4 | — | P1 | Chromium + Vite boot; minute-scale. | Path-filter to digest UI / tap resolver changes. | — |
| 5 | — | D5 check | "Hosted" digest is the Cloud brief feature, not hosted-agent pairing; not a deletion target per DECISIONS. | — | — |

## Proposed end state
Unchanged schedules; product strings imported; single per-model test entry; host duplicate deleted.
