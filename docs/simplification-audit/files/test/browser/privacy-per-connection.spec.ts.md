# test/browser/privacy-per-connection.spec.ts
- Lines: 230 | Kind: Playwright, chromium; real Settings over a 75-line inline Capacitor fake plus `helpers/resident-agent-plugin`; reads `egressPrivacy()` and `connectionController` from `/src` | Verdict: MERGE into `journeys/connection-cloud.spec.ts` (privacy section) and `journeys/settings.spec.ts` (permissions); drop the `remote` scenario with D5
- Covers: for resident/remote/offline connections the privacy contract and the AI connection dialog reflect the phone's saved provider, no invented activity/redaction claims appear, no old Settings pages exist; the Cloud provider never shows a raw `cerebras/` path; a provider key leaked into `providerStatus` never reaches DOM, storage, bridge payloads or console; offline Agent has no action history and no Workflow runs row; action history is read only on explicit refresh; App permissions → Location opens Android settings. Duplicates: `own-provider.production.spec.ts` (provider dialog, no key leaks), `connection-diagnostics` specs (agent panel). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19, 27, 31, 81-85, 144 | A3 (D5) | The `remote` scenario seeds a `remote:` credential and `{kind:'remote'}` selection (remote/paired agent). D5 deletes product paths no production build reaches. | Drop `remote` when C4 removes the remote connection kind; keep resident and offline. | Low. |
| 2 | 125-131, 147, 184, 202, 229 | T6 | `privacyContract()` calls `egressPrivacy(connectionController.getSnapshot())` in page and compares strings; the result is never checked on screen. | Assert the visible privacy line where Settings shows it, or drop. | Low. |
| 3 | 185-191 | B5 | Writes the dump to a file, reads it back and checks it, then checks the same string again. | One `expect(dump).not.toContain(key)`. | None. |
| 4 | 15-17, 138-142 | A8, T1-like | `fixtureActivity` lists old fixture rows ("Drafted a reply to Maya"...) that must never appear: a tombstone check for removed demo data. | Drop once the fixture rows are gone from source (A5); keep `forbidden` redaction claims only if any code can still render them. | Low. |
| 5 | 20-96 | T7 | Inline fake of 7 plugins; `try { } catch {}` around storage (B1). | Typed bridge harness. | Medium. |
| 6 | 156, 198 | A8 | Asserts absence of removed rows (Privacy & data, Models, Activity, Workflow runs). | Drop. | None. |
| 7 | 218 | T6 | `connectionController.getSnapshot().actionHistory` read from `/src`. | Visible "no actions" state only. | None. |

## Proposed end state
Connection-cloud journey: (1) resident and offline: provider dialog shows the saved provider with Voice off and no invented activity; (2) a stray key in provider status never reaches DOM, storage, bridge payloads or console; (3) Cloud selection shows no raw model path; (4) action history only after explicit Refresh, failure shown. Settings journey: Location permission opens Android settings. Remote scenario, tombstone checks and `/src` reads removed.
