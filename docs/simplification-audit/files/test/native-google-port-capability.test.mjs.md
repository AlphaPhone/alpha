# test/native-google-port-capability.test.mjs
- Lines: 68 | Kind: transplant (slices `export const cloudSignIn...` from `apps/app/src/runtime/native-connection.ts` and `async signInWithGoogle(` up to `/** Sends a six-digit code` from `apps/app/src/runtime/cloud-protocol.ts`, esbuild-strips them and evals with fake `registerPlugin`) | Verdict: DELETE
- Covers: on native the Cloud sign-in port hides Capacitor's synthesised `cancelGoogleSignIn`, so a native Google outcome is stored natively and never treated as a browser commit receipt; the browser port keeps its strict receipt guards. Duplicates: `test/google-cancel-boundary.test.mjs` + `test/fixtures/google-cancel-boundary.mjs` (browser commit receipt and `googleSignInCommitted`); `test/browser-cloud-dev-bridge.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-30 | T2 | Cuts two product files at literal text markers and evals the slices with injected globals; any reformat or rename breaks it. | Delete. | Medium: the native "no synthesized browser-receipt method" rule loses its only host check. |
| 2 | 18 | B2 | The bug class exists because the native port relies on Capacitor's proxy for an optional method (`googleCancellationSupported` checks `typeof port.cancelGoogleSignIn`). | Product fix (B2): give the native port an explicit typed interface without `cancelGoogleSignIn`, so the selection is by type, not by runtime probing. | Low once fixed |

## Proposed end state
File deleted. If the B2 fix lands, the rule holds by construction; the browser receipt path stays covered by the
google-cancel-boundary integration and the `journeys/connection-cloud.spec.ts` sign-in journey.
