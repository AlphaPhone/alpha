# specs/quint/application/ViewAdmission.qnt
- Lines: 59 | Kind: Quint model (live: manifest, 5 scenarios, 4 invariants, 3 witnesses, 8 symbol pins) | Verdict: KEEP; PORT the harness's source-text asserts
- Covers: image-only Contacts view admission at runtime: a deferred view reads as none, only enabled views open, revocation while open leaves through the leave path, order follows admission. Duplicates: `test/native-webview-admission.test.mjs` (references the model). Callers/importers: manifest; `test/quint-view-admission.test.mjs` (54) with `refinement/services/identity-comms-traces.mjs` `sourceModule` (esbuild bundle of `mvp-features.ts` + `image-contacts.ts` with stubs); `application/README.md`; `docs/formal-model-audit-2026-11/*`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 18-20 | T1 | The replay test adds two regex source-text asserts: `model.js` must contain `if (DEFERRED_MVP_VIEWS.has(value.view)) value.view = null;` and `main.tsx` must contain `applyImageContacts(admitted,ORDER,shell,admitImageContacts)`; its driver shell then re-implements those two rules. Breaks on Prettier and the `main.tsx` split. | PORT: drop both asserts; drive the real shell rule (export the reported-view rule from the extracted shell core) or accept that the two shell rules are covered by a `journeys/home-shell.spec.ts` case on an image build. | Medium |
| 2 | 35, 34 | — | `ReportedMatchesRaw` follows from `RawViewNeverDeferred` (reported == raw unless raw is an unadmitted contacts). Redundant but cheap. | Optional: drop `ReportedMatchesRaw` and `reported` use in `refreshImage` (use `rawView`). Keep if the harness projects `reported`. | Low |
| 3 | manifest | T10 | 8 symbol pins (`ENABLED_MVP_VIEWS`, `DEFERRED_MVP_VIEWS`, `admitImageContacts`, `isMvpView`, `refreshImage`, `applyImageContacts` ×2, `AOSP_IMAGE_VIEWS`). | Pin files. | Low |

## Proposed end state
Model unchanged (optionally one redundant invariant fewer). Replay imports the real admission modules (already does) and no longer regex-checks `model.js`/`main.tsx`. One runner.
