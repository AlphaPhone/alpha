# test/fixtures/assert-order.mjs
- Lines: 9 | Kind: support helper (order assertion over string/array) | Verdict: DELETE once its importers' source-text cases go
- Covers: `assertBefore(list,a,b)`: both present and a first. Duplicates: none. Callers/importers (6): `test/android-runtime-staging-selection.test.mjs:51` (orders text inside a script source), `aosp-sms.test.mjs:206` (orders `journal.beginMmsDispatch(` before `manager.sendMultimediaMessage(` in Java source text), `cloud-email-resend.test.mjs:34,37` (orders statements in native and browser source text), `chooser-direct-entry.test.mjs`, `ci-emulator-evidence.test.mjs`, `cloud-resident-host.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-9 | T1 | The sampled call sites order substrings of product source text: statement-order pins, not behaviour. | Delete those assertions (T1); the behaviours (MMS journaled before dispatch, resend throttle set before status check) need a JVM/integration case that observes the order. | Medium: "journal before platform send" loses its pin. |
| 2 | 1-9 | T5 | A test helper; tested nowhere, fine. | - | - |

## Proposed end state
After the T1 cases go, check whether any remaining caller orders runtime output (e.g. event logs); if one does, inline `assert.ok(a.indexOf(x) < a.indexOf(y))` there or keep this in `test/support/`. Otherwise delete.
