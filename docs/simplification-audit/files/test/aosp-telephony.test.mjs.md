# test/aosp-telephony.test.mjs
- Lines: 128 | Kind: unit with a Proxy-stub plugin (real import of `apps/app/src/runtime/aosp-telephony.ts`), plus one case against the generated upstream contract `.eliza/client-features/packages/contracts/src/native-telephony.ts` | Verdict: MERGE into `test/integration/phone-sms-contacts.test.ts`
- Covers: off the verified image no client method reaches native code; status, contacts and handoff receipts are validated at the bridge boundary; SMS review rules (recipients, body, SIM choice); the outgoing state machine never allows a repeat after an unknown outcome; phone-number normalisation; only the image client becomes the shared telephony profile. Duplicates: `test/aosp-sms.test.mjs` tests 3-8 (same module, twin `status()`/`stub()`); `test/browser/aosp-phone.spec.ts` drives standalone and image Phone views with `telephony-fixture.ts`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-20 | C5 | `status()` and `stub()` duplicated in aosp-sms with small differences (sendMode, `addListener`). | One builder in the merged file. | none |
| 2 | 22-42 | - | Exhaustive "unavailable off the image" table that also asserts the table covers every client method: strong guard against a new method bypassing the gate. | Keep. | none |
| 3 | 44-114 | T3 | Boundary validators and pure rules; these are the trust boundary for native results, worth keeping as table rows. | Keep, compacted. | none |
| 4 | 116-128 | - | Exercises the real registration with the generated upstream contract. | Keep. | none |

## Proposed end state
One "phone, SMS and contacts" integration file that imports `aosp-telephony.ts`, `aosp-image.ts` and `phone-context.ts`,
with one stub plugin and one status builder, holding the cases from this file and the renderer half of aosp-sms.
