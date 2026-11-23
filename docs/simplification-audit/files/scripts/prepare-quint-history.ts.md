# scripts/prepare-quint-history.ts
- Lines: 38 | Kind: formal-tooling step (network fetch) | Verdict: DELETE (with its two consumers)
- Covers: fetches historical vendor commits named by `specs/quint/legacy/core/source-inventory.json` and `specs/quint/refinement/native/mms-historical-sources.json` so those harnesses can read old source. Duplicates: none. Callers/importers: `npm run quint:prepare-history` inside `npm run verify`; `.github/workflows/browser.yml:130`; `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10 | P6 | Exists only for historical sources: the legacy family (being retired, D11) **and** the historical-counterexample probe in the live native harnesses `mms-dispatch.mjs:23` and `sms-dispatch.mjs:25` (`historicalProbe`). Research said "legacy only"; correction: the MMS/SMS probe must go too. | Delete this script, `quint:prepare-history`, the call in `verify` and `browser.yml:130`, `mms-historical-sources.json`, and the `historicalProbe` campaigns in the two native harnesses (they reproduce a fixed bug against old upstream bytes; current behaviour is checked at the pin). | medium (formal harness edit; current-pin checks must keep passing) |
| 2 | 27 | P1 | The only networked step in `npm run verify`. | Gone with (1). | — |
| 3 | 16 | B3 | Validates the 40-hex revision of a checked-in JSON. | Gone. | — |

## Proposed end state
File deleted. `verify` no longer fetches; legacy models retired; MMS/SMS harnesses check only the pinned sources.
