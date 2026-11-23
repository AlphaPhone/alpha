# test/sms-incomplete-rows.test.mjs
- Lines: 101 | Kind: integration at the native boundary (esbuild-bundles real `prototype/sms-adapter.ts`, replacing `../platform-plugins`, `../runtime/aosp-image` and `./native-adapter` with fixtures; Proxy native plugin; fake `Component`) | Verdict: MERGE into `test/integration/phone-sms.test.mjs` (or REWRITE as `journeys/phone-sms.spec.ts`)
- Covers: Incomplete SMS/MMS provider rows show "Content unavailable", cannot be opened, prefilled or marked read, and never advance the read marker. Duplicates: none in `test/browser` (grep "incomplete" in phone/messages specs finds nothing). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-23 | T2-lite | Three imports replaced by an esbuild plugin; `aospImage=true` forced. | Use the shared native-plugin fake (registerPlugin port) instead of a bundler plugin. | Low |
| 2 | 53-56 | T3 | Fake `Component` with `S()`/`setState` stands in for the shell. | In a journey this disappears. | Low |
| 3 | 60-101 | - | Privacy-relevant: no read receipt for content-free rows; no other coverage. | Keep all three cases. | Med |

## Proposed end state
Prefer a journey: `journeys/phone-sms.spec.ts` with the dev Messages fake returning one incomplete thread and one incomplete message,
asserting the visible copy and that `markThreadRead` is called only through the complete message's date. If kept on host, merge into
the phone-SMS integration file.
