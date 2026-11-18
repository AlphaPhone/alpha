# test/browser/files-location-layout.spec.ts
- Lines: 22 | Kind: Playwright, chromium, dev mode. A layout check through the UI, no `/src` imports | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: on the Files root, the Downloads, Images, Videos, Audio, Documents, Internal storage and Trash rows are each at least 44 px tall, on separate rows, with labels left-aligned within 1 px. Duplicates: the accessibility sweep checks the 44 px target size generically. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T7 | The theme loop has no theme-specific assertion. | Drop it. | none |
| 2 | 15 | T4 | The 44 px minimum duplicates the sweep's target-size rule. | Keep only the label-alignment assertion here, or keep both: it is cheap. | none |
| 3 | 21 | B5 | A screenshot with no assertion. | Drop it. | none |

## Proposed end state
One assertion step ("location rows align") inside the Files root test of `journeys/files.spec.ts`, which already
opens Files.
