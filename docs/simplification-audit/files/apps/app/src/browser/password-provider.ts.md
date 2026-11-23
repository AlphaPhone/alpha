# apps/app/src/browser/password-provider.ts
- Lines: 41 | Role: dev-only simulated password-provider install/select/fill dialog | Verdict: SIMPLIFY + MOVE to apps/app/src/dev/
- Importers: 1 (device.ts, which exposes it through AlphaDevice.openPasswordProvider). Text/path pins: scripts/audit-production-bundle.ts (string denylist pins its text), scripts/storage-specs.ts, specs/quint/application/manifest.json + refinement password-provider-dialog.mjs, test/login-surfaces.test.mjs (reads source), test/browser/password-provider-storage.spec.ts, remaining-dialog-layout.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-20, 27-30 | C4 (P4) | Two copies of the same listener set: pending phase (17-20) and open phase (27-30), each with its own add/remove lists. | One `onRetire(signal)` from the dialog kit for both phases. | Medium: Quint password-provider-dialog models both phases. |
| 2 | 23 | C3 (P5) | Inline `document.hidden\|\|browserScreenLocked()\|\|devBackground==='true'`. | foregroundBlocked(). | None. |
| 3 | 15 | D5 | `if(!browserDevProfile...)` guard; device.ts only exposes it in dev snapshot. | Keep one boundary. | Low. |
| 4 | 6 | C6 | Key literal `alpha.browser.password-provider.v1` duplicated with preference-documents.ts:23. | Export key from preference-documents. | None. |
| 5 | 25, 39 | C4 | cssText + `(document.querySelector('.os')\|\|document.body).append`. | Dialog kit. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| State/validate | type/helper | 7-9 | none | stay |

## Proposed end state
Dev module using the dialog kit, one retire wiring, shared key; audit denylist strings unchanged. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 28 (current 41).

## Verification
password-provider-storage.spec.ts, dev-password-provider.spec.ts, password-provider-dialog Quint harness, audit-production-bundle (flag off), test/login-surfaces.test.mjs.
