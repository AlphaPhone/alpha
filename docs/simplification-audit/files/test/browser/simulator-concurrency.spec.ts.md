# test/browser/simulator-concurrency.spec.ts
- Lines: 35 | Kind: Playwright chromium, 4 tests; module-in-page unit test (T6): blank routed fixture page, `new SimulatorWriter()` from `/src/browser/simulator-writer.ts`, no user action (s1 r0) | Verdict: DELETE
- Covers: the development simulator writer (dev-only `alpha.dev.app.*` storage) refuses a second tab, out-of-lease storage changes, missing Web Locks and a retired page. Duplicates: the user-visible half (second tab cannot reset, retired page cannot reset) is in `simulator-recovery.spec.ts` lines 28-37. Callers/importers: chromium project only; no helper imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-16 | T6 | Constructs `SimulatorWriter` directly on a routed blank page and calls `write()` through `window.writerFixture`; nothing a user does is exercised. | Delete. | Low |
| 2 | 2-3 | T5 / D6 | Tests a development stand-in (Contacts is native in the product; comment says so). The research appendix (`tests-browser.md` row 998) classes it "simulator internals → delete". | Delete; if the writer lease is kept, its user-visible refusals stay in the dev-simulator journey. | Low |
| 3 | 28-31 | B2 | "Web Locks unavailable" path: every supported browser and the Android WebView ship Web Locks. The guard in `simulator-writer.ts` is a phantom capability check. | Delete with the test; flag the guard for the product review. | None |

## Proposed end state
Delete the file. The two refusals a developer can see (another tab owns the data, a retired page cannot write) remain as steps in `journeys/dev-simulator.spec.ts` (from `simulator-recovery.spec.ts`). Whether the Contacts/Phone/Messages simulator survives at all is DECISIONS D19's question; this file adds nothing either way.
