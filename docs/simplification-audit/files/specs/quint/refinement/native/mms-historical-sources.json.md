# specs/quint/refinement/native/mms-historical-sources.json
- Lines: 35 | Kind: historical source inventory (pins upstream revision `b1817660…`, seven messages-plugin files with sha256) | Verdict: DELETE
- Covers: Lets `mms-dispatch.mjs` and `sms-dispatch.mjs` materialise pre-repair upstream sources to reproduce three historical counterexamples. Duplicates: same mechanism as `specs/quint/legacy/core/source-inventory.json`. Callers/importers: `native/mms-dispatch.mjs:23`, `native/sms-dispatch.mjs:25`, `scripts/prepare-quint-history.ts:9` (adds a `git fetch` of that revision to every verify that runs `quint:prepare-history`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-35 | P6/B5 | Evidence about superseded upstream source; the current pin is checked separately. Costs a network fetch. | Delete together with the historical probes in `mms-dispatch.mjs`/`sms-dispatch.mjs`, the historical tests in `test/quint-native-mms-dispatch.test.mjs` and `test/quint-native-sms-dispatch.test.mjs`, and the entry in `prepare-quint-history.ts` (that script goes entirely once `specs/quint/legacy` is retired). | Low |

## Proposed end state
File removed. No behaviour coverage is lost: the current MMS/SMS behaviour is replayed by the live harnesses.
