# specs/quint/application/CallbackLanding.qnt
- Lines: 76 | Kind: Quint model (live, 8 runs, 6 invariants) | Verdict: KEEP
- Covers: the static Cloud delegation return page (`apps/app/public/delegation-return.html`): query multiplicity, 43-char state shape, code/error exclusivity, size limits, URL scrubbed before the `alphaphone://cloud-delegation` link is exposed, error detail never forwarded. Duplicates: `test/quint-conformance.test.mjs` "delegation return page agrees with Quint…" (8 scenario cases) runs the same page in JSDOM as `portable.mjs` `callbackLanding()` (40 query cases). Callers/importers: manifest (1 source); README:53; harness `portable.mjs` `callbackLanding()` via the application aggregate; `test/quint-conformance.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Two harnesses execute the real page script against the model (`portable.mjs` 40 cases; `quint-conformance.test.mjs` 8 cases, the model's own runs). | Keep `portable.mjs` `callbackLanding` (broader) with a per-model wrapper; delete the `quint-conformance.test.mjs` case. | None |
| 2 | harness | — | Reading the HTML file and evaluating its inline `<script>` is the right way to test a static page (the page is the artifact). Not a T10 concern. | None | — |
| 3 | 32-48 | — | `load` enumerates 2^8 * 27 query classes nondeterministically; fine for simulation. | None | — |

## Proposed end state
Unchanged model; one harness (`portable.mjs` `callbackLanding`, ideally moved to its own `callback-landing.mjs` when `portable.mjs` is split) with one wrapper.
