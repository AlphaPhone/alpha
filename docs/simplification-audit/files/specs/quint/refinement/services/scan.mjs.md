# specs/quint/refinement/services/scan.mjs
- Lines: 109 | Kind: Quint refinement driver (bundles real `prototype/scan-document.ts`, `browser/scan-draft.ts`, `prototype/scan-pdf.ts` with module stubs; runs in headless Chromium with real IndexedDB) | Verdict: KEEP; MERGE `specs/quint/services/scan-source-conformance.mjs` into it
- Covers: `ScanDocument` (live, `manifest.json:894`): first page auto-saves a draft; explicit "Save document draft" uses the real draft CAS; a later page change still saves without surrendering explicit ownership; export owns the system picker; visibility change during the picker keeps the review; confirmed export clears an automatic draft and keeps an explicit/unverified one. Duplicates: `specs/quint/services/scan-source-conformance.mjs` (112 lines, run by `test/quint-scan-conformance.test.mjs`) checks explicit-draft preservation through the same `openScanDocument` with stubbed draft storage in JSDOM (T4). Callers: `services/index.mjs:20,77` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Two drivers for one model; this one uses real IndexedDB and covers a superset (four modes incl. explicit export preservation). | Delete `scan-source-conformance.mjs` and `test/quint-scan-conformance.test.mjs` after confirming its single assertion (explicit draft survives export through the shared controller) is the `explicit` mode here. | Low |
| 2 | 44-61 | T6 | Seeds `window.scanPorts`, `scanImageIds`, `observeScanDraft` via `page.evaluate`, then drives real buttons. Mixed: real clicks, backdoor observation of IndexedDB through the module's `readScanDraft`. Acceptable for a refinement harness (observation needs exact revisions). | Keep. | — |
| 3 | 36 | cost | Launches Chromium (needs IndexedDB; JSDOM lacks it). | Keep Chromium, or use `fake-indexeddb` + JSDOM to drop the browser from the services lane. | Low |
| 4 | 30-35 | B5 | Capture/re-capture ceremony duplicated with `reading.mjs`. | Shared helper. | Low |
| 5 | 63, 80 | D8 | 300-character lines building canvases inline. | Extract `makePng(color)`. | Low |
| 6 | — | P1 | Only in the services aggregate. | Own runner entry. | High if forgotten |

## Proposed end state
The single `ScanDocument` driver (absorbing the conformance script), shared capture helper, own runner entry with a
path filter on the scan modules.
