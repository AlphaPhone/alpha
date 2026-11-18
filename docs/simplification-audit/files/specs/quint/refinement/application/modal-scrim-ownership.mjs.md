# specs/quint/refinement/application/modal-scrim-ownership.mjs
- Lines: 82 | Kind: Quint refinement harness (projection of a Chromium fixture run, `ModalScrimOwnership`, live) | Verdict: KEEP
- Covers: the raised-composer scrim press is retired by a covering modal (inline inert or native top layer), delayed releases/compatibility clicks cannot settle a new press, the draft is never activated through a modal (`prototype/chat-overlay-motion-adapter.ts`, `calendar-month-focus.ts`, `runtime/inline-modal.ts`, `runtime/modal-inert.ts`, `phone.css`). Duplicates: `test/modal-scrim-ownership.test.mjs` runs the **same** `observeModalScrim()` Chromium fixture and asserts a subset by hand (T4). Callers/importers: aggregate `index.mjs` only (no `test/quint-modal-scrim-ownership.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Two consumers of one expensive Chromium run: this harness (in the 18-minute aggregate) and `test/modal-scrim-ownership.test.mjs` (in `npm test`). | Delete the host test; run this harness via the manifest runner. | M: deleting the host test before the runner exists leaves it aggregate-only. |
| 2 | 3, 70 | B5 | Calls `checkClientFeatures()` from `scripts/prepare-client-features.ts` — a harness importing a build script to re-validate that `.eliza/client-features` is prepared. | Drop; the prepare step is a precondition of every test lane. | L |
| 3 | 73-75 | T10 | Binds `template.html`, `package-lock.json`, `upstream.lock.json` and `.source.json` as inputs: any lockfile bump marks this receipt stale. | Bind only the files the fixture loads (it reports them via `onInputs`). | L |
| 4 | 11-32 | — | Pure projection from fixture rows to model state; no source text read in this file. The fixture's own mechanics are reviewed with `test/fixtures/modal-scrim-chromium.mjs`. | Keep. | — |

## Proposed end state
Harness unchanged apart from dropping the client-features check and narrowing inputs; the duplicate host test deleted; run once by the manifest runner.
