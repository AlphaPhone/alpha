# test/google-cancel-committed-key.test.mjs
- Lines: 50 | Kind: transplant (slices `cancelSignIn()` from `connection-ui.tsx`, strips types, evals against a hand-built controller object) | Verdict: DELETE
- Covers: on Android (no Google commit boundary) a cancel that lands after the native tail stored a new key adopts that key ("Signed in") instead of showing the method screen; the prior key, no key, or another environment's key leave the cancel as is. Duplicates: none behavioural. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T2, T10 | Markers `  async cancelSignIn() {` to `  /** Google's external browser flow` in the 4.2k-line `connection-ui.tsx` (D1); breaks on the planned split. | Delete. | medium: spec item `spec-cloud-sign-in-F01` loses its only test |
| 2 | 14-25 | T3 | Every collaborator is faked on a bare object. | Carry the case to the connection journey (dev bridge stores a key, then Cancel: page shows signed in) or to an import-based integration once `connection-ui` is split. | low |

## Proposed end state
Gone. The F01 case is one step in `journeys/connection-cloud.spec.ts`.
