# test/google-cancel-boundary.test.mjs
- Lines: 117 | Kind: transplant (via `fixtures/google-cancel-boundary.mjs`: slices `BrowserCloudSignIn` from `browser/cloud-connection.ts` and `signInStep`/`cancelGoogleSignIn` from `runtime/cloud-protocol.ts`, strips types, evals with fake popups and polls) | Verdict: DELETE (with the fixture); carry two race cases to `journeys/connection-cloud.spec.ts`
- Covers: Google sign-in cancel: malformed/ambiguous cancel replies cannot confirm cancellation or stop polling; a failed cancel can be retried; a committed reply is reconciled without aborting the poll; a cancel after commit reports the commit; a delayed cancel of attempt A cannot abort replacement B; a later attempt's commit is not borrowed. Duplicates: Quint `SignInChooser.qnt` / `DevBridgeSignIn.qnt` model the sign-in states; `test/browser/connection*.spec.ts` drive sign-in. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T2 | Fixture markers: `export class BrowserCloudSignIn extends WebPlugin`, `  private async signInStep<T>` to `  /**\n   * The Cloud sign-in hand-off`, and a one-line regex for `async cancelGoogleSignIn(): Promise<boolean> {...}`. | Delete. | medium: cancel/commit races lose direct coverage |
| 2 | 7-117 | — | The race semantics are real and subtle. | Carry "cancel after host commit reports the commit" and "late cancel of A cannot abort B" as journey steps on the dev bridge, or as an integration test that imports `cloud-protocol.ts` and `cloud-connection.ts` normally (both are importable modules). | low |

## Proposed end state
Gone with `fixtures/google-cancel-boundary.mjs`. Two cancel races are covered by an import-based connection-cloud
integration case or the connection journey.
