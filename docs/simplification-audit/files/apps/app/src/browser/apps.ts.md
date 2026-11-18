# apps/app/src/browser/apps.ts
- Lines: 12 | Role: list of browser "installed apps" (package id, label, view) for the web launcher and simulated notifications. | Verdict: SIMPLIFY
- Importers: 3 (`browser/device.ts:7,94-95`, `browser/notifications.ts:9,16`, `main.tsx:20,193`). Text/path pins: `test/support/feature-parity.mjs`; `test/browser-notification-clear.test.mjs:23` fakes `browserApps`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 10 | A3 | `['wallet','Wallet','wallet']` and `'wallet'` in `deferred` — Wallet (AP-13) is deferred; DECISIONS D2 deletes it. | Delete the wallet row and its `deferred` entry, together with the Wallet view (prototype chunk). | Low; `test/browser/dev-wallet.spec.ts` goes with D2. |
| 2 | 1-2, 12 | B4 / D5 | `devSurfacesEnabled&&browserDevProfile` — `browserDevProfile` already contains `devSurfacesEnabled` (`dev-profile.ts:7`). | Use `browserDevProfile\|\|!deferred.has(id)`; drop the `build-flags` import. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `all` app table | const | 3-9 | View ids also listed in `prototype/mvp-features.ts` (deferred views) | Keep here; consider deriving `deferred` from `mvp-features.ts` so the deferral list exists once |

## Proposed end state
~10 lines: 13 apps (no Wallet), one gate (`browserDevProfile`).

## Verification
`test/browser/dev-*` launcher specs, `test/browser-notification-clear.test.mjs`; production bundle audit.
