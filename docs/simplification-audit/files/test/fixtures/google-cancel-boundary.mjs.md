# test/fixtures/google-cancel-boundary.mjs
- Lines: 70 | Kind: transplant (slices product source text, strips types, evals in `vm` with fakes) | Verdict: DELETE (with its only importer)
- Covers: Google Cloud sign-in cancellation: `CloudProtocol.cancelGoogleSignIn` + `signInStep` running against the browser `BrowserCloudSignIn` popup/poll port, so that an unconfirmed cancellation never stops polling and a confirmed one ends the same attempt. Duplicates: partially `test/browser/helpers/native-cloud-signin.ts` driven specs (connection flow, not cancellation races). Callers/importers: only `test/google-cancel-boundary.test.mjs` (117 lines). No spec, script or workflow imports it (grep for `google-cancel-boundary` outside docs).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-18 | T2, T10 | Reads `cloud-connection.ts` and `cloud-protocol.ts` as text and cuts at literals: `'export class BrowserCloudSignIn extends WebPlugin'`, `'  private async signInStep<T>'`, `'  /**\n   * The Cloud sign-in hand-off'`, and a one-line regex for `async cancelGoogleSignIn(): Promise<boolean> {...}`. Any reformat (D9 Prettier), split of `cloud-protocol.ts` (cross-file-actions "cloud-protocol" row) or a multi-line body breaks it. | Delete. | Low: markers still match today (`cloud-protocol.ts:273,283,332`, `cloud-connection.ts:73`), but they will not after Stage F. |
| 2 | 39-57 | T2, T3 | Rebuilds a fake `ProtocolBoundary` class around the sliced method with invented fields (`activeLogin`, `activeGoogleCancellation`, `googleSignInCommitted`, `authority`), fake `WebPlugin`, `CloudProtocolError`, `CloudSignInError.from`, `window.open` popup and `browserCloudCall`. The test asserts behaviour of this reconstruction, not of the shipped class. | Delete. | None. |
| 3 | 22-38 | T3 | Hand-written RPC fake for `signInStartGoogle`/`signInPollGoogle`/`signInCancelGoogle`. | If cancellation coverage is wanted, reuse this protocol shape in a Playwright route fake (`journeys/connection-cloud.spec.ts`) rather than a vm sandbox. | Low. |
| 4 | 70 | C3 | `flush()` (12 microtask turns) is a local copy of the abortable-tick helpers in other fixtures. | Goes with the file. | None. |

## Proposed end state
File and `test/google-cancel-boundary.test.mjs` deleted. The cases worth carrying into `journeys/connection-cloud.spec.ts`
(Google sign-in with a fake Cloud route): (a) a malformed or ambiguous cancel reply leaves the attempt polling and the
popup open, (b) a failed cancel can be retried, (c) a confirmed cancel aborts the poll and closes the popup. If a
host-level check is still wanted, it must import `CloudProtocol` and `BrowserCloudSignIn` (both already exported) with
an injected `browserCloudCall`, not slice text.
