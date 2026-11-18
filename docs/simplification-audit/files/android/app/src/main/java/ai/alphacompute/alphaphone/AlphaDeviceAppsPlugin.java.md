# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaDeviceAppsPlugin.java
- Lines: 29 | Role: Capacitor `DeviceApps`: reports AOSP-image capabilities and opens the system Home chooser from the renderer recovery screen (launcher builds). | Verdict: SIMPLIFY (small)
- Importers: `MainActivity` registration; renderer `apps/app/src/native.ts:11-13` (type), `apps/app/src/main.tsx:380` (`platformCapabilities`), `apps/app/src/runtime/error-boundary.tsx:49-56` (`openHomeChooser`). Text/path pins: `test/aosp-image-capability.test.mjs:139-140` (method list regex `["platformCapabilities","openHomeChooser"]`), `test/error-boundary-home-escape.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17 | A7 / D10 | `result.put("phone",false);...result.put("sms",false);` — hard-coded false, contradicting the launcher's enabled role components and PRD AP-08; the renderer never reads them (`main.tsx:380` reads `aospImage` and `contacts`). `aospImage` and `contacts` are the same expression called twice. | Return `{aospImage, contacts}` computed once; drop `phone`/`sms` from `apps/app/src/native.ts:12`. | Low |
| 2 | 22 | P13 (android) | `if(!BuildConfig.IS_LAUNCHER){call.reject(...)}` — launcher-only behaviour gated at runtime. | Optional: move `openHomeChooser` into the launcher source set (`src/launcher`) and keep standalone's reject. | Low |
| 3 | 10-12 | A8 | Javadoc says "Alpha lists and launches nothing itself" — accurate; fine. | — | — |

## Local types and helpers
None.

## Proposed end state
~26 lines: `platformCapabilities` resolving `{aospImage, contacts}` from one admission read, `openHomeChooser` unchanged.

## Verification
`test/aosp-image-capability.test.mjs`, `test/error-boundary-home-escape.test.mjs`; renderer type check (`npm run verify`).
