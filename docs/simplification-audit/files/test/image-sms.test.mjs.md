# test/image-sms.test.mjs
- Lines: 152 | Kind: mixed. 5 tests are unit tests of `createSmsSession`/`receiptLabel` (real import of `apps/app/src/runtime/image-sms.ts`, fake telephony client). 4 tests esbuild-bundle `apps/app/src/prototype/sms-adapter.ts` with `platform-plugins`/`aosp-image`/`aosp-telephony`/`native-adapter` swapped for inline stub modules and drive `views.messages.render()` (stub-bundle transplant, C) | Verdict: REWRITE as `test/browser/journeys/messages.spec.ts` (adapter cases) and DELETE the rest
- Covers: AOSP-image Messages: session lifecycle (observer start/stop, stale-visit rejection, thread switch fences), mark-read bound by the newest shown row, SMS/MMS send review with stable operation IDs on uncertain outcomes, SIM selection and refusals, draft retention across Back/picture picker/background. Duplicates: `specs/quint/refinement/services/sms-send-replay.mjs` and `mms-compose-replay.mjs` replay SmsSend/MmsCompose traces against the same `sms-adapter.ts` (operation-ID reuse, cancel/deny new review, MMS read-back binding); `test/browser/aosp-telephony-views.spec.ts` (13 tests) drives Messages in the browser, including "Allow SIM" and system review; `test/sms-incomplete-rows.test.mjs` and `test/fixtures/observed-sms-adapter.mjs` also bundle the adapter. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18, 49, 97, 131 | T2, C3 | The same 300-character esbuild bundle-with-stub-plugin block is copy-pasted four times (only the global name differs), with temp-dir writes and `globalThis.__*Port` side channels. | Delete; one journey spec with a typed telephony bridge fake replaces all four. | Low |
| 2 | 7-10, 39 | T3 | `createSmsSession` lifecycle cases (observer stop ordering, stale visit, thread switch) are unit tests with a hand-built client; the SmsSend Quint replay and the telephony view spec drive the same session through the adapter. | Delete. | Medium: "old observer cleanup finishes before a new visit enables observation" is not named in the Quint manifest; carry it as one journey step (leave Messages and return quickly; assert one live observer). |
| 3 | 27-37 | T3 | Mark-read bounded by the newest shown message, only when the SMS role is held, never from the thread list: a privacy/data-integrity rule with no other test found (`grep markThreadRead test/browser` hits only one file, without the bound). | Carry into the journey with a bridge fake that records `markThreadRead(thread, through)`. | Medium |
| 4 | 84-122 | T4 | MMS composer cases (type refusal, attachment labels, uncertain ID reuse, read-back bound to reviewed content) duplicate `mms-compose-replay.mjs`. | Delete; keep only "WebP is refused with a visible notice" in the journey if the replay does not cover file-type refusal. | Low |
| 5 | 124-152 | T3 | Number normalisation/dedupe, "Pick a SIM", "SIM inactive", "Allow SIM", handoff carries no SIM: visible user copy, cheap in a browser journey. | Carry into the journey. | Low |
| 6 | 13-16, 42-46 | B4 | Fake `document`/`window` globals swapped and restored by hand in each test; a leak breaks later tests in the same process. | Gone with the rewrite. | Low |

## Proposed end state
File deleted. `test/browser/journeys/messages.spec.ts` (project chromium, AOSP-image flag on) with one typed telephony
bridge fake (`fixtures/telephony-bridge.ts`, shared with `aosp-telephony-views.spec.ts`) drives: compose to a pasted
formatted number and send once; transport loss then "May have sent" then Send re-queries the same operation; Cancel then
Send opens a new review; two SIMs require a pick; opening a thread marks read through the newest shown row only when the
role is held; leave and return keeps the draft. SmsSend/MmsCompose Quint replays remain the protocol proof.
