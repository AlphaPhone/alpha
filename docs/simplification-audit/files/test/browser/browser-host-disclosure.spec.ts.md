# test/browser/browser-host-disclosure.spec.ts
- Lines: 36 | Kind: Playwright spec, chromium; skipped unless `VITE_LOCAL_AGENT=1` (separate CI step `browser.yml:183`), 1 test | Verdict: DELETE
- Covers: with a synthetic browser host connected, the privacy classification says "Not reported", Settings has no Privacy page, Export diagnostics is only under Developer, and `offline()` returns to the resident host. Duplicates: Settings truth specs (`settings-truth.production`, other chunk). Callers/importers: `.github/workflows/browser.yml:183`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17, 21, 32-34 | T6/P2 | `connectionController.startLocal/offline` and `egressPrivacy()` called directly; the privacy assertion is a unit check. | Delete. | Low. |
| 2 | 22-23, 27 | T1-like | Asserts the absence of a page and a string ("Identifier swap only"). | Delete. | None. |
| 3 | 4 | P17 | Always skipped in normal shards. | Delete; with `browser-agent-tts` gone the extra CI step can go. | None. |

## Proposed end state
File deleted. "Export diagnostics lives under Developer only" can be one step in `journeys/settings.spec.ts` if the owner wants it.
